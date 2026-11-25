"""Capture embedded code data into the root database without executing game code.

Structured review records, exact source snapshots, text fragments, and a file
inventory are separate from canonical authored data. Sources are not deleted.
"""
import argparse
from collections import Counter, defaultdict
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'.git','node_modules','bin','obj','dist','build','.cache','.vite','__pycache__',
        'storybook-static','playwright-report','test-results','2026-11-25'}


def packed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def hashed(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def normalize(value):
    return unicodedata.normalize('NFKC', ' '.join(value.split())).casefold()


def category(path, name):
    value = (path + '/' + name).lower()
    if '/stories/' in value or '.stories.' in value:
        return 'reference'
    for terms, result in [
        (('persona','npc','character','doctor','contact','coworker','supervisor','seed/people'), 'people'),
        (('medical','pharmacy','patient','diagnos','clinical','treatment','vital'), 'medical'),
        (('mission','assignment','activityengine','work_definitions'), 'missions'),
        (('career','workplace','workschedule','payroll','salary','delegation'), 'careers'),
        (('case','evidence','investigation','forensic','court','interrogat'), 'investigations'),
        (('realm','district','landmark','location','housing','venue','geograph'), 'places'),
        (('organization','institution','faction','lineage'), 'organizations'),
        (('lore','history','timeline','calendar'), 'history'),
        (('media','brand','palette','wallpaper','font','publication','music','entertainment'), 'media'),
        (('inventory','items','spellforge','crafting','equipment','modules'), 'objects'),
        (('document','report','template'), 'documents'),
        (('simulation','initial_state','initialstate','default_state','defaultstate'), 'simulation'),
    ]:
        if any(term in value for term in terms):
            return result
    if '/apps/' in value or '/components/' in value or path.endswith('.css'):
        return 'interface'
    return 'gameplay' if '/gameplay/' in value else 'system'


def is_object(value):
    return isinstance(value, dict) and '$sourceExpression' not in value


def records(value):
    if isinstance(value, list) and any(is_object(item) for item in value):
        return [(str(index), item) for index, item in enumerate(value)]
    if is_object(value) and not any(key in value for key in ('id','name','title','label','description')):
        children = [(str(key), item) for key, item in value.items()
                    if key != '$sourceProperties' and (is_object(item) or isinstance(item, list))]
        if children:
            # Scalar siblings and unresolved spreads stay in the full definition.
            return children
    return [('$', value)]


def placeholders(value):
    if isinstance(value, dict):
        return '$sourceExpression' in value or any(placeholders(item) for item in value.values())
    return isinstance(value, list) and any(placeholders(item) for item in value)


def production_source(relative):
    if relative.startswith('frontend/src/'):
        return Path(relative).suffix.lower() in {'.ts','.tsx','.js','.jsx','.json','.css','.html','.sql'}
    return (relative.startswith('Ai/') and relative.endswith('.cs')) or (
        '/' not in relative and Path(relative).suffix.lower() in {'.cs','.sql','.popsql','.html'})


def walk(root):
    for directory, folders, files in os.walk(root):
        folders[:] = sorted(item for item in folders if item not in SKIP
                            and not Path(directory,item).is_symlink())
        for filename in sorted(files):
            path = Path(directory,filename)
            if not path.is_symlink() and not filename.startswith('.env'):
                yield path


def csharp_fragments(text):
    # Lex strings only. Raw/verbatim strings retain exact source when decoding
    # would require C# semantics; no reflection or application execution.
    pattern = re.compile(r'"""[\s\S]*?"""|@"(?:""|[^"])*"|"(?:\\.|[^"\\])*"')
    return [{'line': text.count('\n',0,match.start())+1, 'start': match.start(),
             'kind': 'CSharpString', 'context': 'source-literal', 'text': match.group()}
            for match in pattern.finditer(text)]


def csharp_memory_seeds(text):
    pattern = re.compile(r'\("((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*(\d+(?:\.\d+)?)\)')
    for index, match in enumerate(pattern.finditer(text)):
        try:
            values = [json.loads('"'+part+'"') for part in match.groups()[:3]]
        except ValueError:
            continue
        value = dict(zip(('npc','memoryType','content'),values), importance=float(match.group(4)))
        line = text.count('\n',0,match.start())+1
        yield {'name': f'defaultMemories[{index}]', 'kind': 'memory-seed', 'scope': 'backend-seed',
            'line': line,'endLine':line,'start':match.start(),'end':match.end(),
            'nodeType':'CSharpTuple','text':match.group(),'completeness':'literal','unresolved':0,'value':value}


def build_snapshot(root, extracted_path, db):
    extracted = {}
    with extracted_path.open(encoding='utf-8-sig') as stream:
        for line in stream:
            item = json.loads(line)
            extracted[item['path']] = item
    rows = {key: [] for key in ('ProjectFiles','ProjectSourceArchive','CodeDefinitions','EmbeddedRecords','CodeTextFragments')}
    payloads = {}
    identities = defaultdict(set)
    for identifier, name in db.execute('SELECT CharacterId,Name FROM Characters'):
        identities[normalize(name)].add(identifier)
        identities[identifier].add(identifier)
    for identifier, alias in db.execute('SELECT CharacterId,Alias FROM CharacterAliases'):
        identities[normalize(alias)].add(identifier)
    for identifier, old in db.execute('SELECT CharacterId,LegacyId FROM CharacterLegacyIds'):
        identities[old].add(identifier)
    canonical_payloads = {hashed(packed(json.loads(raw))) for (raw,) in db.execute('SELECT DataJson FROM CharacterProfiles UNION ALL SELECT DataJson FROM WorldRecords')}

    def add_payload(value):
        data = packed(value)
        key = hashed(data)
        payloads[key] = data
        return key

    def add_definition(relative, definition):
        identifier = f"{relative}#{definition['start']}:{definition['name']}"
        rows['CodeDefinitions'].append((identifier,relative,definition['name'],definition['scope'],definition['kind'],
            definition['line'],definition['endLine'],definition['start'],definition['nodeType'],
            definition['completeness'],definition['unresolved'],definition['text'],add_payload(definition['value'])))
        if definition['completeness']=='expression':
            return  # Retained as code, not promoted to a world-content record.
        for key, value in records(definition['value']):
            data_hash = add_payload(value)
            record_name = next((value[field] for field in ('name','title','label','npc')
                               if isinstance(value,dict) and isinstance(value.get(field),str)),
                               definition['name'] if key=='$' else key)
            matches, match_method = set(), 'none'
            if isinstance(value,dict) and isinstance(value.get('id'),str):
                matches = identities.get(value['id'],set())
                if matches: match_method = 'exact-id'
            if not matches:
                matches = identities.get(normalize(record_name),set())
                if matches: match_method = 'exact-name-or-alias'
            if len(matches) != 1:
                matches,match_method = set(),'ambiguous' if len(matches)>1 else 'none'
            status = 'existing-data-reference' if data_hash in canonical_payloads else (
                'runtime-expression' if definition['completeness']=='expression' else 'partial-needs-review' if placeholders(value) else 'needs-review')
            rows['EmbeddedRecords'].append((identifier+'#'+key,identifier,key,record_name,
                category(relative,definition['name']),definition['kind'],data_hash,status,
                next(iter(matches)) if matches else None,match_method))

    for path in walk(root):
        relative = path.relative_to(root).as_posix()
        ext = path.suffix.lower()
        archive = production_source(relative)
        if archive:
            raw = path.read_bytes()
            text = raw.decode('utf-8-sig')
            language = 'typescript' if ext in {'.ts','.tsx'} else 'javascript' if ext in {'.js','.jsx'} else ext.lstrip('.')
            parsed = extracted.get(relative)
            errors = []
            if parsed is not None:
                if parsed.get('sha256')!=hashlib.sha256(raw).hexdigest():
                    raise ValueError(f'Source changed after extraction: {relative}; regenerate the capture first')
                errors = parsed['errors']
                status = 'canonical-generated-link' if parsed['generated'] else 'parse-error' if errors and not parsed['definitions'] else 'partial-parse' if errors else 'parsed'
                for definition in parsed['definitions']:
                    add_definition(relative,definition)
                for fragment in parsed['fragments']:
                    rows['CodeTextFragments'].append((relative,fragment['start'],fragment['line'],fragment['kind'],fragment['context'],fragment['text']))
            elif ext in {'.ts','.tsx','.js','.jsx'}:
                raise ValueError(f'Executable source was not covered by the parser: {relative}')
            elif ext=='.json':
                value = json.loads(text)
                if db.execute('SELECT 1 FROM ContentSources WHERE Path=?',(relative,)).fetchone():
                    status = 'canonical-json-link'
                else:
                    status = 'parsed-json'
                    add_definition(relative,{'name':path.stem,'kind':'json-document','scope':'document',
                        'line':1,'endLine':text.count('\n')+1,'start':0,'end':len(text),'nodeType':'JSON',
                        'text':text,'completeness':'literal','unresolved':0,'value':value})
            elif ext=='.cs':
                status = 'source-and-strings'
                for fragment in csharp_fragments(text):
                    rows['CodeTextFragments'].append((relative,fragment['start'],fragment['line'],fragment['kind'],fragment['context'],fragment['text']))
                if path.name=='NpcMemoryRepository.cs':
                    for definition in csharp_memory_seeds(text): add_definition(relative,definition)
            else:
                status = 'source-only'
            rows['ProjectSourceArchive'].append((relative,language,hashlib.sha256(raw).hexdigest(),text,status,packed(errors)))
            treatment,notes = 'source-captured',status
        elif relative.startswith('docs/'):
            treatment,notes = 'reference-file','Original document/image stays at this path; text references remain in SourceDocuments.'
        elif relative.startswith('frontend/public/'):
            treatment,notes = 'asset-reference','Asset file stays in place; this is its file inventory entry.'
        elif relative.startswith(('wwwroot/','output/','external/','bootstrap/')):
            treatment,notes = 'generated-or-external-reference','Not promoted to additional canonical game records.'
        else:
            treatment,notes = 'project-support-reference','Tooling, tests, configuration or auxiliary project file; inventoried, not executed.'
        if ext in {'.db','.sqlite','.sqlite3'} or path.name.endswith(('.db-wal','.db-shm')):
            treatment,notes = 'database-reference','Existing database or journal, not recursively imported.'
        rows['ProjectFiles'].append((relative,ext.lstrip('.') or 'file',path.stat().st_size,treatment,notes))
    rows['EmbeddedPayloads'] = list(payloads.items())
    return rows


def verify(db, rows):
    for table, expected in rows.items():
        if table=='ProjectFiles':
            # The database and its journals change size during the import itself.
            stored_paths={row[0] for row in db.execute('SELECT Path FROM ProjectFiles')}
            if not {row[0] for row in expected}.issubset(stored_paths):
                raise ValueError('Incomplete project file inventory')
            continue
        stored = set(db.execute(f'SELECT * FROM "{table}"'))
        if not set(expected).issubset(stored):
            raise ValueError(f'Incomplete or changed capture in {table}')
    if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or list(db.execute('PRAGMA foreign_key_check')):
        raise ValueError('Database integrity/reference checks failed')
    if db.execute('SELECT count(*) FROM EmbeddedRecords').fetchone()[0]!=db.execute('SELECT count(*) FROM BrowseEmbeddedData').fetchone()[0]:
        raise ValueError('An extracted record is missing its category or payload')


def run(root, database, extracted, backup_dir=None, check=False, progress=None):
    notify=progress or (lambda message: None)
    notify('Capturing production sources and file inventory...')
    with closing(sqlite3.connect(database.resolve().as_uri()+'?mode=ro',uri=True)) as db:
        db.execute('PRAGMA cache_size=-65536')
        rows = build_snapshot(root,extracted,db)
        canonical_before = list(db.execute('SELECT * FROM Characters ORDER BY CharacterId'))
        if check:
            notify('Comparing the stored capture and checking database integrity...')
            verify(db,rows)
    backup = None
    if not check:
        if backup_dir is None: raise ValueError('Provide --backup-dir before changing the database')
        backup_dir.mkdir(parents=True,exist_ok=True)
        backup = backup_dir / ('miraverse-before-embedded-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.db')
        with closing(sqlite3.connect(database.resolve().as_uri()+'?mode=ro',uri=True)) as source, closing(sqlite3.connect(backup)) as target:
            source.backup(target)
        notify('Consistent backup completed. Importing the captured records...')
        with closing(sqlite3.connect(database,timeout=15)) as db,db:
            db.execute('PRAGMA cache_size=-65536')
            db.execute('PRAGMA foreign_keys=ON')
            schema = Path(__file__).with_name('embedded_content_schema.sql').read_text(encoding='utf-8')
            db.executescript('BEGIN IMMEDIATE;\n'+schema)
            for table in ('ProjectFiles','ProjectSourceArchive','EmbeddedPayloads','CodeDefinitions','EmbeddedRecords','CodeTextFragments'):
                notify(f'{table}: checking and importing {len(rows[table])} rows...')
                key = (lambda row: (row[0],row[1],row[3])) if table=='CodeTextFragments' else (lambda row: row[0])
                existing={key(row):tuple(row) for row in db.execute(f'SELECT * FROM "{table}"')}
                pending=[]
                for row in rows[table]:
                    old=existing.get(key(row))
                    if old and tuple(old)!=row:
                        # File sizes are inventory metadata, not user-authored content.
                        if table=='ProjectFiles':
                            db.execute('UPDATE ProjectFiles SET FileType=?,ByteSize=?,Treatment=?,Notes=? WHERE Path=?',(*row[1:],row[0]))
                        else:
                            raise ValueError(f'{table} already has different data for {row[0]}; existing edits were not overwritten')
                    elif old is None:
                        pending.append(row)
                if pending:
                    db.executemany(f'INSERT INTO "{table}" VALUES ({",".join("?" for _ in pending[0])})',pending)
            for source in rows['ProjectSourceArchive']:
                db.execute("UPDATE MigrationInventory SET Status='captured-for-review',Notes=? WHERE Path=?",
                    ('Exact source archived; definitions and text fragments extracted without executing game code. '+source[4],source[0]))
            db.execute("INSERT OR IGNORE INTO ContentMigrations VALUES (3,'Embedded source, data definitions, text and file inventory captured for review')")
            if canonical_before!=list(db.execute('SELECT * FROM Characters ORDER BY CharacterId')):
                raise ValueError('Canonical identities changed unexpectedly')
            notify('Checking complete source equality, integrity, and references...')
            verify(db,rows)
        notify('Import transaction committed.')
    statuses = Counter(row[4] for row in rows['ProjectSourceArchive'])
    return {'database':str(database.resolve()),'backup':str(backup) if backup else None,
        'counts':{table:len(values) for table,values in rows.items()},'source_statuses':dict(statuses),
        'definition_completeness':dict(Counter(row[9] for row in rows['CodeDefinitions'])),
        'parse_errors':[row[0] for row in rows['ProjectSourceArchive'] if row[4] in ('parse-error','partial-parse')],
        'canonical_characters_preserved':len(canonical_before),
        'mode':'verified' if check else 'captured',
        'scope':'All production frontend source plus root/Ai C# and SQL source. Other assets and project files inventoried by path.',
        'authority':'Review capture only; no source deletion, automatic NPC creation, or runtime cutover.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=ROOT)
    parser.add_argument('--database',type=Path)
    parser.add_argument('--extracted',type=Path,required=True)
    parser.add_argument('--backup-dir',type=Path)
    parser.add_argument('--report',type=Path)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    result=run(args.root,args.database or args.root/'miraverse.db',args.extracted,args.backup_dir,args.check,
               progress=lambda message: print(message,flush=True))
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=='__main__': main()
