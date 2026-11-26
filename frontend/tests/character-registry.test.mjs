import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import {
  CHARACTER_IDENTITIES,
  CHARACTER_LINKS,
  RETIRED_CHARACTERS,
  RETIRED_CHARACTER_IDS,
  getActiveRegisteredCitizens,
  getCharacterById,
  getCharacterByMaid,
  isArchivedSubjectReference,
  isRetiredCharacterId,
  resolveCharacterReference,
  findCharactersByName,
} from '../src/game-content/characters/registry.ts';
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const {
  AUTHORIZED_REGISTRATION_REGION_CODES,
  RETIRED_MAID_SERIALS,
  allocateNextMaid,
  isRetiredMaidSerial,
  validateMaidFormat,
} = await import('../src/services/maidIdentityService.ts');

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const manifest = read('../src/game-content/characters/manifest.json');

test('reconciled canonical roster has 62 characters, 53 registered MAIDs across 8 realms, 8 document-only, 1 companion', () => {
  assert.equal(CHARACTER_IDENTITIES.length, 62);
  assert.equal(manifest.characters.length, 62);
  assert.equal(RETIRED_CHARACTERS.length, 20);

  const activePersons = getActiveRegisteredCitizens();
  const docOnly = CHARACTER_IDENTITIES.filter(p => p.kind === 'person' && p.status === 'document-only');
  const companions = CHARACTER_IDENTITIES.filter(p => p.kind === 'companion');

  assert.equal(activePersons.length, 53);
  assert.equal(docOnly.length, 8);
  assert.equal(companions.length, 1);
  assert.equal(companions[0].id, 'char-mai');

  // Every active person has a valid, unique MAID across the 8 authorized regional codes and canonical fields
  const seenMaids = new Set();
  for (const person of activePersons) {
    assert.ok(person.maid, `${person.id} missing MAID`);
    assert.ok(person.firstName, `${person.id} missing firstName`);
    assert.ok(person.lastName, `${person.id} missing lastName`);
    assert.ok(person.occupation, `${person.id} missing occupation`);
    assert.ok(person.homeRealm, `${person.id} missing homeRealm`);

    const check = validateMaidFormat(person.maid);
    assert.equal(check.valid, true, `Canonical MAID ${person.maid} for ${person.id} failed validation: ${check.error}`);
    assert.equal(check.retired, false, `Canonical MAID ${person.maid} must not collide with retired serials`);
    assert.equal(seenMaids.has(person.maid.toUpperCase()), false, `Duplicate MAID ${person.maid}`);
    seenMaids.add(person.maid.toUpperCase());
    assert.equal(getCharacterByMaid(person.maid)?.id, person.id);
  }
  assert.equal(seenMaids.size, 53);

  // Verify the 7 newly registered canonical characters and their assigned regional MAIDs
  for (const [id, name, occ, realm, maid] of [
    ['char-amara-okafor', 'Amara Okafor', 'Intelligence Analyst', 'Orynvell', 'MAID-OR-00481975'],
    ['char-isabelle-laurent', 'Isabelle Laurent', 'Archival Research Specialist', 'Lumia', 'MAID-LU-00481976'],
    ['char-darius-mensah', 'Darius Mensah', 'Senior Systems Engineer', 'Kaji', 'MAID-KA-00481977'],
    ['char-mei-lin-zhao', 'Mei Lin Zhao', 'Systems Integration Engineer', 'Brisland', 'MAID-BR-00481978'],
    ['char-samira-el-amin', 'Samira El-Amin', 'Senior Diplomatic Affairs Officer', 'Marlowe', 'MAID-MA-00481979'],
    ['char-mateo-rivera', 'Mateo Rivera', 'Community Services Coordinator', 'Ve’Raylia', 'MAID-VR-00481980'],
    ['char-nyla-baptiste', 'Nyla Baptiste', 'Recording Artist and Songwriter', 'Marlowe', 'MAID-MA-00481981'],
  ]) {
    const c = getCharacterById(id);
    assert.ok(c, `Missing newly registered character ${id}`);
    assert.equal(c.name, name);
    assert.equal(c.occupation, occ);
    assert.equal(c.homeRealm, realm);
    assert.equal(c.maid, maid);
  }

  // Verify out-of-home-realm MAIDs are preserved without alteration
  assert.equal(getCharacterById('char-elena-rostova')?.maid, 'MAID-OR-00481931');
  assert.equal(getCharacterById('char-elena-rostova')?.homeRealm, 'Fross');
  assert.equal(getCharacterById('char-kieran-vesper')?.maid, 'MAID-OR-00481929');
  assert.equal(getCharacterById('char-kieran-vesper')?.homeRealm, 'Nephele');
  assert.equal(getCharacterById('char-sora-takahashi')?.maid, 'MAID-OR-00481930');
  assert.equal(getCharacterById('char-sora-takahashi')?.homeRealm, 'Kaji');

  // Verify retired serials 00481926, 00481927, 00481928 are permanently protected
  for (const serial of [481926, 481927, 481928]) {
    assert.equal(RETIRED_MAID_SERIALS.has(serial), true);
    assert.equal(isRetiredMaidSerial(`MAID-OR-00${serial}`), true);
    assert.equal(validateMaidFormat(`MAID-OR-00${serial}`).retired, true);
  }

  // Verify all 8 regional codes validate and allocate above canonical high-water mark
  assert.equal(AUTHORIZED_REGISTRATION_REGION_CODES.length, 8);
  for (const code of AUTHORIZED_REGISTRATION_REGION_CODES) {
    const sample = `MAID-${code}-00481999`;
    const result = validateMaidFormat(sample);
    assert.equal(result.valid, true, `Region ${code} should be valid`);
    assert.equal(result.region, code);
    const allocated = allocateNextMaid([], code);
    assert.match(allocated, new RegExp(`^MAID-${code}-\\d{8}$`));
    assert.equal(isRetiredMaidSerial(allocated), false);
  }
});

test('deleted characters are excluded from active rosters and distinguished from historical case subjects', () => {
  for (const deletedId of ['char-elara-vale', 'char-mara-thorne', 'char-vaelen', 'char-kaelen', 'char-neryx', 'char-lyric-enya']) {
    assert.equal(isRetiredCharacterId(deletedId), true);
    assert.equal(getCharacterById(deletedId), undefined);
  }
  assert.equal(RETIRED_CHARACTER_IDS.size, 20);

  // All six permanently archived historical case subjects remain preserved without entering active population
  for (const [coll, key] of [
    ['FORMAL_INVESTIGATION_CASES', 'CASE-FM-401'],
    ['FORMAL_INVESTIGATION_CASES', 'CASE-DGA-402'],
    ['PATIENT_CARE_ASSIGNMENTS', 'pc-mercer'],
    ['INV_26_402_STARTING_PAYLOAD', 'P-402'],
    ['MOTORCYCLE_CRASH_MEDICAL_CHART', 'PAT-94102'],
    ['OVERDOSE_TOXICOLOGY_MEDICAL_CHART', 'PAT-95881'],
  ]) {
    assert.equal(resolveCharacterReference(coll, key), undefined, `${coll}/${key} must not resolve as active citizen`);
    assert.equal(isArchivedSubjectReference(coll, key), true, `${coll}/${key} must be preserved as archivedSubject`);
  }
});

test('name variants merge under document names and updated canonical names are reflected', () => {
  for (const [oldId, id, name] of [
    ['char-aelita-schaeffer', 'char-aelita-hopper', 'Aelita Hopper'],
    ['char-odd-della-robbia', 'char-odd-della-robia', 'Odd Della Robia'],
    ['char-elisabeth-delmas', 'char-sissi-delmas', 'Sissi Delmas'],
    ['char-riven-asterwind', 'char-riven-kalbera', 'Riven Kalbera'],
    ['char-k-vesper', 'char-kieran-vesper', 'Kieran Vesper'],
    ['char-elena-rostova-crash', 'char-elena-rostova', 'Elena Rostova'],
  ]) {
    assert.equal(getCharacterById(oldId), getCharacterById(id));
    assert.equal(getCharacterById(id)?.name, name);
  }
  // Verify updated canonical names from miraverse.db
  assert.equal(getCharacterById('char-rowan')?.name, 'Archivist Rowan Alderwick');
  assert.equal(getCharacterById('char-vael')?.name, 'Headmistress Serena Vael');
  assert.equal(getCharacterById('char-vael')?.status, 'document-only');
  assert.equal(getCharacterById('char-unidentified-driver-p404')?.name, 'Adrian Locke');
  assert.equal(getCharacterById('char-nerya')?.name, 'Nerya Solenne');
  assert.equal(findCharactersByName('Aelita Schaeffer')[0].id, 'char-aelita-hopper');
  assert.equal(resolveCharacterReference('PEOPLE', 'aelita')?.id, resolveCharacterReference('story-bible', 'Aelita Hopper')?.id);
  for (const key of ['constructor', '__proto__', 'toString', 'Vance']) {
    assert.equal(resolveCharacterReference('PEOPLE', key), undefined);
  }
});

test('all active app projections read canonical profiles without leaking deleted characters or secrets', async () => {
  const { getProfiles: worlds } = await import('../src/game-content/characters/collections/NPCS.ts');
  const { getProfiles: social } = await import('../src/game-content/characters/collections/PEOPLE.ts');
  assert.equal(worlds().length, 8);
  assert.equal(social().length, 7);
  assert.equal(worlds().find(person => person.id === 'npc-vesper').name, 'Kieran Vesper');
  assert.equal(social().find(person => person.id === 'aelita').name, 'Aelita Hopper');
  assert.equal(social().find(person => person.id === 'aelita').characterId, 'char-aelita-hopper');
  assert.equal(social().find(person => person.id === 'mara'), undefined);
  const first = social();
  first[0].name = 'View mutation';
  assert.notEqual(social()[0].name, 'View mutation');
  assert.equal(new Set(CHARACTER_LINKS.map(link => JSON.stringify([link.collection, link.key]))).size, CHARACTER_LINKS.length);
  assert.ok(CHARACTER_IDENTITIES.every(person => !Object.hasOwn(person, 'secrets') && !Object.hasOwn(person, 'knowledge')));
});

test('case contexts, clinical fields, dialogue keys and immutable identities survive reconciliation', async () => {
  const { getProfile: casePerson } = await import('../src/game-content/characters/collections/INV_26_402_STARTING_PAYLOAD.ts');
  const { getProfile: agencyPerson } = await import('../src/game-content/characters/collections/seedPeople.ts');
  assert.equal(casePerson('P-401').characterId, agencyPerson('P-105').characterId);
  assert.match(casePerson('P-401').status, /Deceased/);
  assert.equal(agencyPerson('P-105').status, 'Active');
  const { getProfile: chart } = await import('../src/game-content/characters/collections/INITIAL_MEDICAL_CHART.ts');
  assert.equal(chart('PAT-88194').linkedInvestigationCaseId, undefined);
  assert.ok(Object.hasOwn(chart('PAT-88194'), 'linkedInvestigationCaseId'));
  const { getProfile: persona } = await import('../src/game-content/characters/collections/personas.ts');
  assert.match(persona('Aelita').systemContext, /Aelita Hopper/);
  assert.doesNotMatch(persona('Aelita').systemContext, /Schaeffer/);
  const { npcEngine } = await import('../src/gameplay/NPCEngine.ts');
  assert.equal(npcEngine.getPersona('Aelita Hopper'), npcEngine.getPersona('Aelita'));
  assert.equal(npcEngine.getPersona('Aelita Schaeffer'), npcEngine.getPersona('Aelita'));
  assert.equal(npcEngine.getPersona('constructor'), undefined);
  assert.throws(() => {
    getCharacterById('char-aelita-hopper').aliases.push('overwrite');
  }, TypeError);
});
