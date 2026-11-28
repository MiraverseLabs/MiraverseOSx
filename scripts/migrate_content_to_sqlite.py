"""Import authored game content without deleting sources or changing runtime saves.

No external dependencies. Existing rows must match exactly: reruns cannot silently
overwrite edits made in DB Browser. --check is entirely read-only.
"""
import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import unicodedata
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = Path(__file__).with_name('content_schema.sql')
CATEGORIES = Path(__file__).with_name('content_categories.sql')
RELATIONSHIP_VIEW = '''CREATE VIEW CharacterRelationships AS
SELECT json_extract(p.DataJson,'$.id') AS RelationshipId,
       p.CharacterId AS OwnerCharacterId,
       json_extract(p.DataJson,'$.sourceId') AS SourceId,
       json_extract(p.DataJson,'$.sourceName') AS SourceName,
       json_extract(p.DataJson,'$.targetId') AS TargetId,
       json_extract(p.DataJson,'$.targetName') AS TargetName,
       json_extract(p.DataJson,'$.type') AS Type,
       json_extract(p.DataJson,'$.notes') AS Notes,
       source.CharacterId AS SourceCharacterId,target.CharacterId AS TargetCharacterId,
       p.Collection,p.RecordKey
FROM CharacterProfiles p
LEFT JOIN ResolvedCharacterReferences source ON source.ReferenceId=json_extract(p.DataJson,'$.sourceId')
LEFT JOIN ResolvedCharacterReferences target ON target.ReferenceId=json_extract(p.DataJson,'$.targetId')
WHERE p.Collection='seedRelationships' '''
SKIP = {'.git', 'node_modules', 'bin', 'obj', 'dist', 'build', '.cache', '.vite',
        'storybook-static', 'playwright-report', 'test-results', '__pycache__'}
CHAR_BASE = 'frontend/src/game-content/characters/'


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def walk_files(root):
    for directory, folders, files in os.walk(root):
        folders[:] = sorted(d for d in folders if d not in SKIP and not Path(directory, d).is_symlink())
        for name in sorted(files):
            path = Path(directory, name)
            if not path.is_symlink():
                yield path


def content_domain(path):
    if path.startswith('frontend/src/game-content/'):
        folder = path.split('/')[3]
        return 'media' if folder == 'media-assets' else folder
    if path.startswith('frontend/src/dgaos/data/cases/'):
        return 'cases'
    if path.startswith('frontend/src/dgaos/data/banks/'):
        return 'generation-banks'
    stem = Path(path).stem.lower()
    if stem.startswith('broad-street-'):
        return 'missions' if stem.endswith('assignment') else 'cases'
    return stem


def is_catalog(path):
    if path.startswith(CHAR_BASE):
        return False
    return any(path.startswith(prefix) for prefix in (
        'frontend/src/game-content/', 'frontend/src/data/', 'frontend/src/dgaos/data/')) and path.endswith('.json')


def source_records(value):
    # Keep complex case/mission objects whole; never turn nested evidence or
    # clinical arrays into unscoped standalone public records.
    if isinstance(value, list):
        return [('$', index, None, item) for index, item in enumerate(value)]
    if isinstance(value, dict) and set(value).intersection({'version', 'schemaVersion'}) and not set(value).intersection({'id', 'caseId', 'meta'}):
        rows = [(key, index, None, item) for key, items in value.items() if isinstance(items, list)
                for index, item in enumerate(items)]
        # Explicitly supported keyed catalogues; do not flatten arbitrary nested
        # case data or invent IDs for records that have none in their source.
        for section in ('palettes', 'brandKits'):
            if isinstance(value.get(section), dict):
                rows.extend((section, index, key, item) for index, (key, item)
                            in enumerate(value[section].items()))
        return rows or [('$', 0, None, value)]
    return [('$', 0, None, value)]


def collect(root):
    rows = {table: [] for table in ('ContentSources', 'Characters', 'CharacterAliases',
        'CharacterLegacyIds', 'CharacterProfiles', 'CharacterRelationships', 'WorldRecords',
        'SourceDocuments', 'MigrationInventory')}
    loaded = {}

    def load(relative, category):
        if relative not in loaded:
            raw = (root / relative).read_bytes()
            value = json.loads(raw.decode('utf-8-sig'))
            rows['ContentSources'].append((relative, category, digest(raw), packed(value)))
            loaded[relative] = value
        return loaded[relative]

    manifest = load(CHAR_BASE + 'manifest.json', 'character-manifest')
    order = {(item['collection'], item['key']): index for index, item in enumerate(manifest['order'])}
    if len(order) != len(manifest['order']):
        raise ValueError('Duplicate profile keys in manifest')
    profiles, owners = [], {}
    for item in manifest['characters']:
        relative = CHAR_BASE + f"people/{item['folder']}/character.json"
        person = load(relative, 'character-identity')
        if (person['id'], person['name'], person['folder']) != (item['id'], item['name'], item['folder']):
            raise ValueError(f'Manifest disagrees with {relative}')
        normalized_status = 'existing' if str(person.get('status') or '').lower() == 'document-only' else (person.get('status') or 'existing')
        rows['Characters'].append((person['id'], person['name'], person['kind'], normalized_status,
            person['folder'], person.get('maid'), packed(person.get('notes', [])), relative,
            person.get('firstName'), person.get('lastName'), person.get('title'),
            person.get('occupation'), person.get('homeRealm')))
        owners[person['id']] = person['id']
        for index, alias in enumerate(person.get('aliases', [])):
            rows['CharacterAliases'].append((person['id'], alias, index))
        for index, old in enumerate(person.get('legacyIds', [])):
            rows['CharacterLegacyIds'].append((old, person['id'], index))
        for ref in person['references']:
            rel = Path(ref['file'])
            if rel.is_absolute() or '..' in rel.parts or not ref['file'].startswith(f"people/{item['folder']}/"):
                raise ValueError(f'Invalid source path: {ref["file"]}')
            source = CHAR_BASE + ref['file']
            entries = load(source, 'character-profiles')
            matches = [(i, p) for i, p in enumerate(entries)
                       if (p['collection'], p['key']) == (ref['collection'], ref['key'])]
            if len(matches) != 1:
                raise ValueError(f'Missing/duplicate profile: {ref}')
            index, profile = matches[0]
            token = (profile['collection'], profile['key'])
            rows['CharacterProfiles'].append((*token, person['id'], profile['context'], profile['origin'],
                source, index, order[token], packed(profile['data']), packed(profile['original'])))
            profiles.append((person['id'], profile))
            if profile['collection'] != 'seedRelationships':
                for identifier in (profile['key'], profile['data'].get('id') if isinstance(profile['data'], dict) else None):
                    if identifier:
                        owners.setdefault(identifier, set())
                        if isinstance(owners[identifier], set):
                            owners[identifier].add(person['id'])
    if len(rows['CharacterProfiles']) != len(order):
        raise ValueError('Profile count disagrees with manifest')

    def resolve(identifier):
        candidates = owners.get(identifier)
        return candidates if isinstance(candidates, str) else next(iter(candidates)) if candidates and len(candidates) == 1 else None

    for owner, profile in profiles:
        if profile['collection'] != 'seedRelationships':
            continue
        data = profile['data']
        rows['CharacterRelationships'].append((data['id'], owner, data['sourceId'], data.get('sourceName'),
            data['targetId'], data.get('targetName'), data['type'], data.get('notes'),
            resolve(data['sourceId']), resolve(data['targetId']), profile['collection'], profile['key']))

    files_scanned = 0
    for path in walk_files(root):
        files_scanned += 1
        relative = path.relative_to(root).as_posix()
        suffix = path.suffix.lower()
        category, status, notes = None, None, None
        if relative in loaded:
            category, status, notes = 'characters', 'imported', 'Canonical identity/profile source, preserved in full.'
        elif is_catalog(relative):
            if Path(relative).name == 'worldData.json' or '/generated/' in relative:
                category, status, notes = 'generated-content', 'derived-not-imported', 'Generated projection; its owning sources take precedence.'
            else:
                domain = content_domain(relative)
                value = load(relative, domain)
                seen = set()
                for section, index, source_key, record in source_records(value):
                    key = str(record.get('id', record.get('key', source_key if source_key is not None else index))) if isinstance(record, dict) else str(index)
                    if (section, key) in seen:
                        raise ValueError(f'Duplicate catalogue key in {relative}: {section}/{key}')
                    seen.add((section, key))
                    name = record.get('name', record.get('title', record.get('id'))) if isinstance(record, dict) else str(record)
                    description = next((record[k] for k in ('description', 'summary', 'bio', 'role')
                        if isinstance(record.get(k), str)), None) if isinstance(record, dict) else None
                    rows['WorldRecords'].append((relative, section, key, index, domain, str(name) if name is not None else None, description, packed(record)))
                category, status, notes = domain, 'imported', 'Exact source JSON retained; catalogue entries indexed separately.'
        elif relative.startswith('docs/') and suffix in {'.docx', '.pdf', '.md', '.json', '.csv', '.sql'}:
            raw = path.read_bytes()
            text = None
            document_status = 'reference-only'
            if suffix == '.docx':
                with zipfile.ZipFile(path) as archive:
                    xml = ET.fromstring(archive.read('word/document.xml'))
                    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                    text = '\n'.join(''.join(t.text or '' for t in p.findall('.//w:t', ns))
                                     for p in xml.findall('.//w:p', ns))
                document_status = 'text-extracted-not-canonical'
            elif suffix != '.pdf':
                text = raw.decode('utf-8-sig')
                document_status = 'text-extracted-not-canonical'
            rows['SourceDocuments'].append((relative, suffix.lstrip('.'), digest(raw), text, document_status))
            category, status, notes = 'documentation', document_status, 'Reference only; does not create characters or overwrite canon.'
        elif suffix in {'.db', '.sqlite', '.sqlite3'}:
            category, status, notes = 'database', 'existing-database', 'Inventoried; no runtime saves or memories copied into authored content.'
        elif relative.startswith('frontend/src/') and suffix in {'.ts', '.tsx'}:
            category = 'embedded-typescript'
            if relative.startswith(CHAR_BASE + 'collections/'):
                status, notes = 'derived-not-imported', 'Generated character loader; original JSON profiles imported.'
            else:
                status, notes = 'review-needed', 'Code may contain additional authored literals or runtime logic; not executed or automatically promoted to records.'
        elif suffix in {'.json', '.sql', '.csv', '.docx', '.pdf'}:
            category, status, notes = 'other-file', 'inventoried-only', 'Configuration, tooling, reference, or generated output; not automatically promoted to game content.'
        if category:
            rows['MigrationInventory'].append((relative, category, status, notes))
    return rows, files_scanned


TABLE_COLUMNS = {
    'ContentSources': ('Path', 'Category', 'Sha256', 'ContentJson'),
    'Characters': (
        'CharacterId', 'Name', 'Kind', 'Status', 'Folder', 'Maid',
        'NotesJson', 'SourcePath', 'FirstName', 'LastName', 'Title',
        'Occupation', 'HomeRealm',
    ),
    'CharacterAliases': ('CharacterId', 'Alias', 'Position'),
    'CharacterLegacyIds': ('LegacyId', 'CharacterId', 'Position'),
    'CharacterProfiles': (
        'Collection', 'RecordKey', 'CharacterId', 'Context', 'Origin',
        'SourcePath', 'SourceIndex', 'CollectionOrder', 'DataJson', 'OriginalJson',
    ),
    'CharacterRelationships': (
        'RelationshipId', 'OwnerCharacterId', 'SourceId', 'SourceName',
        'TargetId', 'TargetName', 'Type', 'Notes', 'SourceCharacterId',
        'TargetCharacterId', 'Collection', 'RecordKey',
    ),
    'WorldRecords': (
        'SourcePath', 'Section', 'RecordKey', 'Position', 'Domain',
        'Name', 'Description', 'DataJson',
    ),
    'SourceDocuments': ('Path', 'Format', 'Sha256', 'Text', 'Status'),
    'MigrationInventory': ('Path', 'Category', 'Status', 'Notes'),
}

KEYS = {'ContentSources': (0,), 'Characters': (0,), 'CharacterAliases': (0, 1),
        'CharacterLegacyIds': (0,), 'CharacterProfiles': (0, 1), 'CharacterRelationships': (0,),
        'WorldRecords': (0, 1, 2), 'SourceDocuments': (0,), 'MigrationInventory': (0,)}


def _retired_character_ids(db):
    exists = db.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='RetiredCharacters'"
    ).fetchone()
    if not exists:
        return set()
    return {row[0] for row in db.execute('SELECT CharacterId FROM RetiredCharacters')}


def _ensure_character_schema(db):
    cols = {row[1] for row in db.execute('PRAGMA table_info("Characters")')}
    for col in ('FirstName', 'LastName', 'Title', 'Occupation', 'HomeRealm'):
        if col not in cols:
            db.execute(f'ALTER TABLE Characters ADD COLUMN "{col}" TEXT')
    db.execute(
        """CREATE UNIQUE INDEX IF NOT EXISTS UniqueCharacterMAID
           ON Characters (UPPER(TRIM(Maid)))
           WHERE Maid IS NOT NULL AND TRIM(Maid) != ''"""
    )


def connect_readonly(path):
    return sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)


def validate(db, expected):
    if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise ValueError('Database integrity check failed')
    if list(db.execute('PRAGMA foreign_key_check')):
        raise ValueError('Database has broken references')
    retired = _retired_character_ids(db)
    for table, entries in expected.items():
        if table == 'MigrationInventory':
            continue  # Inventory can change when reports/backups are added.
        cols = TABLE_COLUMNS[table]
        col_sql = ', '.join(f'"{c}"' for c in cols)
        stored = {tuple(row[i] for i in KEYS[table]): tuple(row) for row in db.execute(f'SELECT {col_sql} FROM "{table}"')}
        filtered_entries = [
            row for row in entries
            if not (table == 'Characters' and row[0] in retired)
            and not (table in ('CharacterAliases', 'CharacterProfiles') and row[0 if table == 'CharacterAliases' else 2] in retired)
            and not (table == 'CharacterLegacyIds' and row[1] in retired)
            and not (table == 'CharacterRelationships' and row[1] in retired)
        ]
        for row in filtered_entries:
            key = tuple(row[i] for i in KEYS[table])
            if stored.get(key) != row:
                raise ValueError(f'{table} differs from source at {key}; database edits have NOT been overwritten.')
        if set(stored) != {tuple(row[i] for i in KEYS[table]) for row in filtered_entries}:
            raise ValueError(f'{table} has extra records; source deletion is not applied automatically.')


def screen(db):
    """Check actual data, including names beyond SQLite's ASCII case folding."""
    names = {}
    for identifier, name in db.execute('SELECT CharacterId,Name FROM Characters'):
        normalized = unicodedata.normalize('NFKC', ' '.join(name.split())).casefold()
        if not normalized or normalized in names:
            raise ValueError(f'Duplicate or empty NPC name: {name!r}')
        names[normalized] = identifier
    for table, key_columns in [('CharacterProfiles', ['CharacterId','DataJson']),
                               ('WorldRecords', ['Domain','DataJson'])]:
        seen = set()
        for owner, raw in db.execute(f'SELECT {",".join(key_columns)} FROM {table}'):
            key = (owner, json.dumps(json.loads(raw), sort_keys=True, ensure_ascii=False))
            if key in seen:
                raise ValueError(f'Identical redundant record in {table}: {owner}')
            seen.add(key)
    profile_count = db.execute('SELECT count(*) FROM CharacterProfiles').fetchone()[0]
    world_count = db.execute('SELECT count(*) FROM WorldRecords').fetchone()[0]
    if profile_count != db.execute('SELECT count(*) FROM BrowseProfiles').fetchone()[0]:
        raise ValueError('Some character profiles have missing or inconsistent category mappings')
    if world_count != db.execute('SELECT count(*) FROM BrowseWorldCatalog').fetchone()[0]:
        raise ValueError('Some world records have missing or inconsistent category mappings')
    return {'duplicate_npc_names': 0, 'identical_redundant_records': 0,
        'uncategorized_records': 0,
        'profile_types': db.execute('SELECT count(DISTINCT ProfileType) FROM BrowseProfiles').fetchone()[0],
        'world_categories': db.execute('SELECT count(*) FROM ContentCategories').fetchone()[0],
        'relationship_storage': db.execute("SELECT type FROM sqlite_master WHERE name='CharacterRelationships'").fetchone()[0],
        'identities_deleted': 0, 'names_changed': 0}


def consolidate_relationships(db):
    """Replace duplicated relationship storage only when every value survives."""
    old_type = db.execute("SELECT type FROM sqlite_master WHERE name='CharacterRelationships'").fetchone()
    old = None
    if old_type and old_type[0] == 'table':
        old = set(db.execute('SELECT * FROM CharacterRelationships'))
        db.execute('DROP TABLE CharacterRelationships')
    elif old_type:
        db.execute('DROP VIEW CharacterRelationships')
    db.execute(RELATIONSHIP_VIEW)
    if old is not None and old != set(db.execute('SELECT * FROM CharacterRelationships')):
        raise ValueError('Relationship consolidation would change information; rolling back')
    db.execute("INSERT OR IGNORE INTO ContentMigrations VALUES (2,'Consistent categories, unique names, derived relationships, keyed catalogues')")


def migrate(root, database, backup_dir=None, check=False):
    rows, scanned = collect(root)
    backup = None
    if check:
        with closing(connect_readonly(database)) as db:
            validate(db, rows)
            screening = screen(db)
    else:
        if database.exists():
            if backup_dir is None:
                raise ValueError('An existing database requires --backup-dir')
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            backup = backup_dir / f'{database.stem}-before-content-{stamp}.db'
            with closing(connect_readonly(database)) as source, closing(sqlite3.connect(backup)) as target:
                source.backup(target)
        database.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(database, timeout=15)) as db, db:
            db.execute('PRAGMA foreign_keys=ON')
            # executescript commits implicitly; include BEGIN so schema and data
            # are rolled back together on import or validation failure.
            db.executescript('BEGIN IMMEDIATE;\n' + SCHEMA.read_text(encoding='utf-8') + '\n' + CATEGORIES.read_text(encoding='utf-8'))
            _ensure_character_schema(db)
            retired = _retired_character_ids(db)
            for table, entries in rows.items():
                if table == 'CharacterRelationships':
                    continue  # Derived from profile data, not maintained twice.
                columns = TABLE_COLUMNS[table]
                col_sql = ', '.join(f'"{c}"' for c in columns)
                placeholders = ','.join('?' for _ in columns)
                keys = KEYS[table]
                for entry in entries:
                    if table == 'Characters' and entry[0] in retired:
                        continue
                    if table == 'CharacterAliases' and entry[0] in retired:
                        continue
                    if table == 'CharacterLegacyIds' and entry[1] in retired:
                        continue
                    if table == 'CharacterProfiles' and entry[2] in retired:
                        continue
                    where = ' AND '.join(f'"{columns[i]}"=?' for i in keys)
                    old = db.execute(f'SELECT {col_sql} FROM "{table}" WHERE {where}', tuple(entry[i] for i in keys)).fetchone()
                    if old is not None:
                        if tuple(old) != entry and table != 'MigrationInventory':
                            raise ValueError(f'{table} differs from source; refusing to overwrite {tuple(entry[i] for i in keys)}')
                        if table == 'MigrationInventory':
                            db.execute(f'UPDATE "{table}" SET Category=?, Status=?, Notes=? WHERE Path=?', (*entry[1:], entry[0]))
                    else:
                        db.execute(f'INSERT INTO "{table}" ({col_sql}) VALUES ({placeholders})', entry)
            consolidate_relationships(db)
            validate(db, rows)
            screening = screen(db)
    return {'database': str(database.resolve()), 'backup': str(backup.resolve()) if backup else None,
        'files_scanned': scanned, 'counts': {table: len(entries) for table, entries in rows.items()},
        'collections': len({row[0] for row in rows['CharacterProfiles']}),
        'screening': screening,
        'review_needed': sum(row[2] == 'review-needed' for row in rows['MigrationInventory']),
        'runtime_storage': str(Path(os.environ.get('LOCALAPPDATA', str(root))) / 'MiraverseOSx'),
        'mode': 'verified' if check else 'imported',
        'authority': 'Staged database copy. Game still reads existing authored files. No runtime cutover or source deletion.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--database', type=Path)
    parser.add_argument('--backup-dir', type=Path)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = migrate(args.root.resolve(), args.database or args.root / 'miraverse.db', args.backup_dir, args.check)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
