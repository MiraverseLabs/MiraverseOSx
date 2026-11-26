// Inventory person-owned authored content without executing gameplay or modifying saves.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'frontend/src/game-content/characters/';
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const manifest = read(base + 'manifest.json');
const conflicts = read('docs/data/character-conflicts.json');
const bible = read('docs/data/story-bible-characters.json');
const identities = read(base + 'people.json');
const links = read(base + 'legacy-links.json');
const openIssues = conflicts.filter(issue => issue.status !== 'resolved');
const records = [];
const directories = [];

for (const item of manifest.characters) {
  const person = read(base + `people/${item.folder}/character.json`);
  directories.push(person);
  for (const ref of person.references) {
    const profile = read(base + ref.file).find(entry => entry.collection === ref.collection && entry.key === ref.key);
    if (!profile) throw new Error(`Missing person-owned record ${ref.collection}/${ref.key}`);
    const value = profile.data;
    records.push({
      source: base + ref.file,
      collection: ref.collection,
      key: ref.key,
      characterId: person.id,
      name: person.name,
      role: person.occupation || value.role || value.title || value.occupation || '',
      institution: value.affiliation || value.organization || value.institution || value.department || '',
      maid: person.maid || value.fixedMaid || value.maid || value.patientMaid || null,
      homeRealm: person.homeRealm || null,
      aliases: person.aliases,
      originalSource: profile.origin,
      archivedSubject: false,
    });
  }
}

for (const subject of manifest.archivedSubjects || []) {
  for (const ref of subject.references || []) {
    const profile = read(base + ref.file).find(entry => entry.collection === ref.collection && entry.key === ref.key);
    if (!profile) throw new Error(`Missing archived subject record ${ref.collection}/${ref.key}`);
    const value = profile.data;
    records.push({
      source: base + ref.file,
      collection: ref.collection,
      key: ref.key,
      characterId: subject.id,
      name: subject.name,
      role: value.role || value.title || value.occupation || '',
      institution: value.affiliation || value.organization || value.institution || value.department || '',
      maid: value.fixedMaid || value.maid || value.patientMaid || null,
      homeRealm: null,
      aliases: [],
      originalSource: profile.origin,
      archivedSubject: true,
    });
  }
}

const sources = [...new Set(records.map(record => record.collection))];
const cell = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const outputs = new Map();
outputs.set('docs/data/character-sources.json', JSON.stringify({ version: 3, scope: sources, records }, null, 2) + '\n');

const report = [
  '# Character directory and resolved conflicts', '',
  `${directories.length} canonical character folders (synced from miraverse.db) own ${records.filter(r => !r.archivedSubject).length} active records plus ${records.filter(r => r.archivedSubject).length} historical/case archived subject records across ${sources.length} collections. ${(manifest.retiredCharacters || []).length} retired characters are explicitly excluded from active rosters. ${conflicts.length} documented conflicts are resolved; ${openIssues.length} remain open.`, '',
  '## Canonical Roster', '',
  '| Character | Shared ID | MAID | Home Realm | Occupation | Kind / Status | Records |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...directories.map(person => `| ${cell(person.name)} | ${person.id} | ${cell(person.maid || '—')} | ${cell(person.homeRealm || '—')} | ${cell(person.occupation || '—')} | ${person.kind} / ${person.status} | ${person.references.length} |`), '',
  '## Retired Characters (Excluded from Active Rosters)', '',
  '| Character | Retired ID | Context |',
  '| --- | --- | --- |',
  ...(manifest.retiredCharacters || []).map(r => `| ${cell(r.name)} | ${r.id} | ${cell(r.historicalContext || r.reason)} |`), '',
  '## Provenance and access', '',
  `The user-supplied ${bible.document} is identified by SHA-256 ${bible.sha256}. miraverse.db is the authoritative roster of 55 canonical characters. Run python scripts/sync_characters_from_db.py followed by node scripts/build_character_content.mjs and node scripts/audit_characters.mjs to regenerate projections.`, '',
].join('\n');

outputs.set('docs/data/CHARACTER_INVENTORY.md', report);

for (const [file, content] of outputs) {
  const target = path.join(root, file);
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== content) throw new Error(`Stale character report: ${file}`);
  } else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

if (records.length !== manifest.order.length || records.length !== links.length) {
  throw new Error(`Character record count mismatch: records=${records.length}, order=${manifest.order.length}, links=${links.length}`);
}
for (const record of records) {
  if (!links.some(link => link.collection === record.collection && link.key === record.key && link.characterId === record.characterId)) {
    throw new Error('Character link mismatch');
  }
}
if (identities.length !== directories.length) throw new Error('Identity index is stale');
console.log(`Inventoried ${directories.length} canonical folders and ${records.length} records (${records.filter(r => r.archivedSubject).length} archived historical). ${openIssues.length} unresolved conflicts.`);
