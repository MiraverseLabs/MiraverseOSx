import importlib.util
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('content_migration', Path(__file__).with_name('migrate_content_to_sqlite.py'))
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class ContentMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.database = self.root / 'miraverse.db'
        self.base = Path(migration.CHAR_BASE)
        self.profile = {'collection': 'seedPeople', 'key': 'P-1', 'context': 'case-context',
            'origin': 'original.ts:1', 'data': {'id': 'P-1', 'name': 'Renée', 'status': 'deceased'},
            'original': {'id': 'P-1', 'name': 'Earlier name', 'status': 'deceased'}}
        self.person = {'id': 'char-one', 'name': 'Renée', 'kind': 'person', 'status': 'existing',
            'folder': 'one', 'maid': None, 'notes': ['Case status is not global life status.'],
            'aliases': ['R.'], 'legacyIds': ['char-old'], 'references': [
                {'collection': 'seedPeople', 'key': 'P-1', 'file': 'people/one/agency.json'}]}
        self.write(self.base / 'manifest.json', {'characters': [
            {'id': 'char-one', 'name': 'Renée', 'folder': 'one'}],
            'order': [{'collection': 'seedPeople', 'key': 'P-1'}]})
        self.write(self.base / 'people/one/character.json', self.person)
        self.write(self.base / 'people/one/agency.json', [self.profile])
        self.write(Path('frontend/src/game-content/places/places.json'),
                   {'version': '1', 'realms': [{'id': 'r-1', 'name': 'Aureline'}]})
        self.write(Path('frontend/src/data/careers.json'), [{'id': 'medic', 'name': 'Medic'}])
        self.write(Path('frontend/src/data/worldData.json'), {'npcs': [{'id': 'stale'}]})
        code = self.root / 'frontend/src/gameplay/Medical.ts'
        code.parent.mkdir(parents=True)
        code.write_text('export const DOCTORS = [{name: "not automatically imported"}];')

    def write(self, relative, value):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def test_lossless_import_preserves_context_and_ignores_derived_data(self):
        result = migration.migrate(self.root, self.database)
        self.assertEqual(result['counts']['Characters'], 1)
        with closing(sqlite3.connect(self.database)) as db, db:
            data, original, context = db.execute('SELECT DataJson, OriginalJson, Context FROM CharacterProfiles').fetchone()
            self.assertEqual(json.loads(data), self.profile['data'])
            self.assertEqual(json.loads(original), self.profile['original'])
            self.assertEqual(context, 'case-context')
            self.assertEqual(db.execute('SELECT Status FROM Characters').fetchone()[0], 'existing')
            self.assertEqual(db.execute('SELECT CharacterId FROM CharacterLegacyIds').fetchone()[0], 'char-one')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM WorldRecords').fetchone()[0], 2)
            self.assertEqual(db.execute("SELECT Status FROM MigrationInventory WHERE Path LIKE '%Medical.ts'").fetchone()[0], 'review-needed')
        migration.migrate(self.root, self.database, check=True)

    def test_rerun_preserves_database_edits_and_makes_valid_backup(self):
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("UPDATE Characters SET Name='Edited in DB Browser'")
        with self.assertRaisesRegex(ValueError, 'refusing to overwrite'):
            migration.migrate(self.root, self.database, self.root / 'backups')
        with closing(sqlite3.connect(self.database)) as db, db:
            self.assertEqual(db.execute('SELECT Name FROM Characters').fetchone()[0], 'Edited in DB Browser')
        backups = list((self.root / 'backups').glob('*.db'))
        self.assertEqual(len(backups), 1)
        with closing(sqlite3.connect(backups[0])) as db:
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')

    def test_idempotent_import_does_not_duplicate_rows(self):
        first = migration.migrate(self.root, self.database)
        second = migration.migrate(self.root, self.database, self.root / 'backups')
        self.assertEqual(first['counts']['Characters'], second['counts']['Characters'])
        migration.migrate(self.root, self.database, check=True)

    def test_existing_legacy_data_survives_and_failure_rolls_back(self):
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute('CREATE TABLE NPCs (id TEXT PRIMARY KEY)')
            db.execute("INSERT INTO NPCs VALUES ('legacy')")
            # Force a mid-transaction conflict after Characters were inserted.
            db.execute('CREATE TABLE CharacterLegacyIds (LegacyId TEXT PRIMARY KEY, CharacterId TEXT, Position INTEGER)')
            db.execute("INSERT INTO CharacterLegacyIds VALUES ('char-old','someone-else',0)")
        with self.assertRaises(ValueError):
            migration.migrate(self.root, self.database, self.root / 'backups')
        with closing(sqlite3.connect(self.database)) as db, db:
            self.assertEqual(db.execute('SELECT id FROM NPCs').fetchone()[0], 'legacy')
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sqlite_master WHERE name='Characters'").fetchone()[0], 0)

    def test_docx_is_reference_text_and_does_not_create_npcs(self):
        document = self.root / 'docs/npc_profiles.docx'
        document.parent.mkdir()
        with zipfile.ZipFile(document, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Unresolved NPC</w:t></w:r></w:p></w:body></w:document>')
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db, db:
            self.assertEqual(db.execute('SELECT Text FROM SourceDocuments').fetchone()[0], 'Unresolved NPC')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM Characters').fetchone()[0], 1)

    def test_categories_cover_profiles_and_preserve_source_collection(self):
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute('SELECT Category,ProfileType,SourceCollection FROM BrowseProfiles').fetchone(),
                             ('People', 'Agency', 'seedPeople'))
            self.assertEqual(db.execute('SELECT Category,RecordType FROM BrowseWorldCatalog WHERE RecordKey=?', ('r-1',)).fetchone(),
                             ('Places', 'Realm'))

    def test_duplicate_npc_name_is_blocked_in_database(self):
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db, db:
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute('INSERT INTO Characters SELECT ?,?,Kind,Status,?,Maid,NotesJson,SourcePath FROM Characters',
                           ('duplicate', '  Renée  ', 'duplicate'))

    def test_keyed_brand_catalogues_are_indexed_without_modifying_their_records(self):
        palette = {'name': 'Palette', 'swatches': {'red': '#ff0000'}}
        self.write(Path('frontend/src/game-content/media-assets/brand-kits.json'),
                   {'version': '1', 'palettes': {'palette-one': palette},
                    'brandKits': {'brand-one': {'id': 'brand-one', 'name': 'Brand'}}})
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db:
            data = db.execute("SELECT DataJson FROM WorldRecords WHERE Section='palettes' AND RecordKey='palette-one'").fetchone()
            self.assertEqual(json.loads(data[0]), palette)
            self.assertEqual(db.execute("SELECT count(*) FROM BrowseWorldCatalog WHERE Category='Media'").fetchone()[0], 2)

    def test_relationship_upgrade_preserves_every_endpoint_and_removes_duplicate_storage(self):
        relation = {'collection': 'seedRelationships', 'key': 'REL-1', 'context': 'seedRelationships',
                    'origin': 'relationships.ts:1', 'data': {'id': 'REL-1', 'sourceId': 'P-1',
                    'sourceName': 'Renée', 'targetId': 'ORG-1', 'targetName': 'An institution',
                    'type': 'employed_by', 'notes': 'Keep context'},
                    'original': {'original': 'retained'}}
        self.person['references'].append({'collection': 'seedRelationships', 'key': 'REL-1', 'file': 'people/one/relationships.json'})
        self.write(self.base / 'people/one/character.json', self.person)
        self.write(self.base / 'people/one/relationships.json', [relation])
        manifest = json.loads((self.root / self.base / 'manifest.json').read_text(encoding='utf-8'))
        manifest['order'].append({'collection': 'seedRelationships', 'key': 'REL-1'})
        self.write(self.base / 'manifest.json', manifest)
        migration.migrate(self.root, self.database)
        with closing(sqlite3.connect(self.database)) as db, db:
            before = db.execute('SELECT * FROM CharacterRelationships').fetchall()
            db.execute('CREATE TABLE OldRelationships AS SELECT * FROM CharacterRelationships')
            db.execute('DROP VIEW CharacterRelationships')
            db.execute('ALTER TABLE OldRelationships RENAME TO CharacterRelationships')
        migration.migrate(self.root, self.database, self.root / 'backups')
        with closing(sqlite3.connect(self.database)) as db, db:
            self.assertEqual(db.execute('SELECT * FROM CharacterRelationships').fetchall(), before)
            self.assertEqual(db.execute("SELECT type FROM sqlite_master WHERE name='CharacterRelationships'").fetchone()[0], 'view')
            record = db.execute('SELECT SourceCharacterId,TargetCharacterId FROM CharacterRelationships').fetchone()
            self.assertEqual(record, ('char-one', None))
            data = dict(relation['data'], notes='Updated once')
            db.execute('UPDATE CharacterProfiles SET DataJson=? WHERE Collection=?',
                       (migration.packed(data), 'seedRelationships'))
            self.assertEqual(db.execute('SELECT Notes FROM CharacterRelationships').fetchone()[0], 'Updated once')


if __name__ == '__main__':
    unittest.main()
