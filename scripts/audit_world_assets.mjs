import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentDir = path.join(root, 'frontend/src/game-content');
const publicDir = path.join(root, 'frontend/public');
const fontsDir = path.join(root, 'frontend/src/assets/fonts');

const readJson = rel => JSON.parse(readFileSync(path.join(contentDir, rel), 'utf8'));

const places = readJson('places/places.json');
const orgs = readJson('organizations/organizations.json');
const objects = readJson('objects/objects.json');
const history = readJson('history/history.json');
const brandKits = readJson('media-assets/brand-kits.json');
const manifest = readJson('media-assets/manifest.json');
const people = readJson('characters/people.json');

const errors = [];
const knownIds = new Set(people.map(p => p.id));

// 1. Validate Eight Realms including Ve'Raylia
if (places.realms.length !== 8) {
  errors.push(`Expected 8 canonical realms in places.json, found ${places.realms.length}.`);
}
const veraylia = places.realms.find(r => r.id === 'REG_VERAYLIA');
if (!veraylia || veraylia.capital !== 'Elmore' || veraylia.rulingLineage !== 'House Valmon') {
  errors.push('Missing or misconfigured 8th realm Ve’Raylia (Capital: Elmore, Ruling Lineage: House Valmon).');
}

for (const group of [
  places.realms,
  places.landmarks,
  places.venues,
  orgs.royalLineages,
  orgs.colorHouses,
  orgs.institutions,
  orgs.mediaAndBrands,
  objects.objects,
  history.eras,
  history.loreEntries,
]) {
  for (const item of group) {
    if (!item.id) errors.push(`Missing id on item: ${JSON.stringify(item)}`);
    if (knownIds.has(item.id)) errors.push(`Duplicate world asset ID across domains: ${item.id}`);
    knownIds.add(item.id);
  }
}

if (orgs.royalLineages.length !== 8) errors.push(`Expected 8 royal lineages, found ${orgs.royalLineages.length}.`);
if (orgs.colorHouses.length !== 7) errors.push(`Expected 7 Color Houses, found ${orgs.colorHouses.length}.`);

// 2. Validate Fonts & BJCree Hold Rule
for (const font of brandKits.fonts) {
  if (font.id === 'bjcree') {
    if (font.status !== 'held_pending_license' || font.localFiles.length > 0) {
      errors.push('BJCree must remain held_pending_license until embedding license is verified.');
    }
    continue;
  }
  for (const file of font.localFiles) {
    if (!existsSync(path.join(fontsDir, file))) {
      errors.push(`Missing bundled OFL font file: frontend/src/assets/fonts/${file}`);
    }
  }
}

// 3. Validate Media Manifest Provenance, Disk Existence & Entity Links
const assetIds = new Set();
for (const asset of manifest.assets) {
  if (!asset.id.startsWith('canon:')) errors.push(`Canon manifest asset must use canon: prefix (${asset.id})`);
  if (assetIds.has(asset.id)) errors.push(`Duplicate media asset ID: ${asset.id}`);
  assetIds.add(asset.id);
  const diskPath = path.join(publicDir, asset.src.replace(/^\//, ''));
  if (!existsSync(diskPath)) errors.push(`Missing static media file on disk for ${asset.id}: ${asset.src}`);
  if (!asset.provenance?.creator || !asset.provenance?.license || !asset.provenance?.approvalStatus) {
    errors.push(`Incomplete provenance metadata on ${asset.id}`);
  }
  for (const entityId of asset.entityIds || []) {
    if (!knownIds.has(entityId)) errors.push(`Media asset ${asset.id} references unknown entity ID: ${entityId}`);
  }
}

// 4. Validate Brand Kit Asset References
for (const [kitId, kit] of Object.entries(brandKits.brandKits)) {
  if (kit.organizationId && !knownIds.has(kit.organizationId)) {
    errors.push(`Brand kit ${kitId} references unknown organization ${kit.organizationId}`);
  }
  for (const [slot, assetRef] of Object.entries(kit.assets || {})) {
    if (!assetIds.has(assetRef)) {
      errors.push(`Brand kit ${kitId} slot '${slot}' references missing asset '${assetRef}'`);
    }
  }
}

if (errors.length > 0) {
  console.error('World Asset Library audit failed:\n - ' + errors.join('\n - '));
  process.exit(1);
}

console.log(
  `Validated World Asset Library: ${people.length} people, ${places.realms.length} realms, ${places.venues.length + places.landmarks.length} places, ` +
    `${orgs.royalLineages.length + orgs.colorHouses.length + orgs.institutions.length + orgs.mediaAndBrands.length} organizations, ` +
    `${objects.objects.length} objects, ${history.eras.length + history.loreEntries.length} history records, ${manifest.assets.length} provenance-verified media assets.`,
);
