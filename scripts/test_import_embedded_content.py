from contextlib import closing
import importlib.util
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('embedded_import',Path(__file__).with_name('import_embedded_content.py'))
embedded=importlib.util.module_from_spec(spec)
spec.loader.exec_module(embedded)


class EmbeddedImportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)/'game'
        self.root.mkdir()
        self.db=self.root/'miraverse.db'
        self.backups=Path(self.temp.name)/'backups'
        self.extracted=Path(self.temp.name)/'extracted.jsonl'
        self.source=self.root/'frontend/src/data/people.ts'
        self.source.parent.mkdir(parents=True)
        self.source.write_text("const people=[{name:'Aelita'}];",encoding='utf-8')
        self.parsed={'path':'frontend/src/data/people.ts','generated':False,'errors':[],
            'fragments':[{'start':10,'line':1,'kind':'StringLiteral','context':'ObjectProperty','text':'Aelita'}],
            'definitions':[{'name':'people','kind':'variable','scope':'module','line':1,'endLine':1,
                'start':13,'end':20,'nodeType':'ArrayExpression','text':"[{name:'Aelita'}]",
                'completeness':'literal','unresolved':0,'value':[{'name':'Aelita'}]}]}
        self.write_extracted()
        scripts=Path(__file__).parent
        with closing(sqlite3.connect(self.db)) as db,db:
            db.executescript((scripts/'content_schema.sql').read_text(encoding='utf-8')+(scripts/'content_categories.sql').read_text(encoding='utf-8'))
            db.execute('INSERT INTO ContentSources VALUES (?,?,?,?)',('a.json','identity','hash','{}'))
            db.execute('INSERT INTO Characters VALUES (?,?,?,?,?,?,?,?)',('char-a','Aelita','person','existing','a',None,'[]','a.json'))

    def write_extracted(self):
        self.parsed['sha256']=hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.extracted.write_text(json.dumps(self.parsed)+'\n',encoding='utf-8')

    def test_capture_links_existing_identity_without_creating_duplicate_person(self):
        result=embedded.run(self.root,self.db,self.extracted,self.backups)
        self.assertEqual(result['canonical_characters_preserved'],1)
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('SELECT CanonicalCharacterId FROM EmbeddedRecords').fetchone()[0],'char-a')
            self.assertEqual(db.execute('SELECT count(*) FROM Characters').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT SourceText FROM ProjectSourceArchive').fetchone()[0],self.source.read_text())
        embedded.run(self.root,self.db,self.extracted,check=True)

    def test_changed_source_or_database_edit_is_not_silently_overwritten(self):
        embedded.run(self.root,self.db,self.extracted,self.backups)
        self.source.write_text('const changed = 1;',encoding='utf-8')
        with self.assertRaisesRegex(ValueError,'Source changed after extraction'):
            embedded.run(self.root,self.db,self.extracted,self.backups)
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('SELECT SourceText FROM ProjectSourceArchive').fetchone()[0],"const people=[{name:'Aelita'}];")

    def test_unparsed_javascript_is_a_failure_not_silently_omitted(self):
        (self.source.parent/'missed.ts').write_text('const missing=1;')
        with self.assertRaisesRegex(ValueError,'not covered by the parser'):
            embedded.run(self.root,self.db,self.extracted,self.backups)

    def test_runtime_expression_is_archived_without_promotion_to_content(self):
        declaration=dict(self.parsed['definitions'][0],name='balance',start=30,
            completeness='expression',unresolved=1,value={'$sourceExpression':{'type':'CallExpression','text':'getBalance()'}})
        self.parsed['definitions'].append(declaration)
        self.write_extracted()
        result=embedded.run(self.root,self.db,self.extracted,self.backups)
        self.assertEqual(result['counts']['CodeDefinitions'],2)
        self.assertEqual(result['counts']['EmbeddedRecords'],1)

    def test_duplicate_payload_is_stored_once_with_separate_source_occurrences(self):
        declaration=dict(self.parsed['definitions'][0],name='otherPeople',start=40)
        self.parsed['definitions'].append(declaration)
        self.write_extracted()
        result=embedded.run(self.root,self.db,self.extracted,self.backups)
        self.assertEqual(result['counts']['EmbeddedRecords'],2)
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('SELECT count(DISTINCT PayloadHash) FROM EmbeddedRecords').fetchone()[0],1)


if __name__=='__main__': unittest.main()
