-- Human-facing categories are independent of legacy source collection names.
CREATE TABLE IF NOT EXISTS ContentCategories (
    CategoryId TEXT PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE
);
INSERT OR IGNORE INTO ContentCategories VALUES
('people','People'),('places','Places'),('organizations','Organizations'),
('careers','Careers'),('missions','Missions'),('investigations','Investigations'),
('history','History'),('media','Media'),('objects','Objects'),
('documents','Documents'),('generation','Generation resources');

CREATE TABLE IF NOT EXISTS ProfileTypes (
    ProfileTypeId TEXT PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE,
    CategoryId TEXT NOT NULL REFERENCES ContentCategories(CategoryId)
);
INSERT OR IGNORE INTO ProfileTypes VALUES
('background','Background','people'),('social','Social','people'),
('communications','Communications','people'),('dialogue','Dialogue','people'),
('identity','Identity registry','people'),('employment','Employment','people'),
('agency','Agency','people'),('relationships','Relationships','people'),
('story','Story','people'),('investigation','Investigation context','people'),
('medical','Medical context','people');

CREATE TABLE IF NOT EXISTS ProfileCollectionCategories (
    Collection TEXT PRIMARY KEY,
    ProfileTypeId TEXT NOT NULL REFERENCES ProfileTypes(ProfileTypeId)
);
INSERT OR IGNORE INTO ProfileCollectionCategories VALUES
('NPCS','background'),('PEOPLE','social'),('AUREMAIL_DIRECTORY','communications'),
('phone-contact','communications'),('personas','dialogue'),('defaultInputs','identity'),
('INSTITUTIONAL_REGISTRY','employment'),('primarySeedAgent','agency'),
('seedNPCs','agency'),('seedPeople','agency'),('seedRelationships','relationships'),
('story-bible','story'),('DGA_26_194_STARTING_PAYLOAD','investigation'),
('FORMAL_INVESTIGATION_CASES','investigation'),('INV_26_402_STARTING_PAYLOAD','investigation'),
('INITIAL_MEDICAL_CHART','medical'),('MOTORCYCLE_CRASH_MEDICAL_CHART','medical'),
('OVERDOSE_TOXICOLOGY_MEDICAL_CHART','medical'),('PATIENT_CARE_ASSIGNMENTS','medical');

CREATE TABLE IF NOT EXISTS WorldCategoryMappings (
    Domain TEXT NOT NULL,
    Section TEXT NOT NULL,
    CategoryId TEXT NOT NULL REFERENCES ContentCategories(CategoryId),
    RecordType TEXT NOT NULL,
    PRIMARY KEY(Domain,Section)
);
INSERT OR IGNORE INTO WorldCategoryMappings VALUES
('places','realms','places','Realm'),('places','landmarks','places','Landmark'),
('places','venues','places','Venue'),
('organizations','royalLineages','organizations','Royal lineage'),
('organizations','colorHouses','organizations','Color house'),
('organizations','institutions','organizations','Institution'),
('organizations','mediaAndBrands','organizations','Media organization or brand'),
('history','eras','history','Era'),('history','loreEntries','history','Lore entry'),
('objects','objects','objects','Object'),('careers','$','careers','Career'),
('missions','$','missions','Mission'),('cases','$','investigations','Case document'),
('generation-banks','$','generation','Generation bank'),
('media','assets','media','Asset'),('media','fonts','media','Font'),
('media','templates','media','Template'),('media','palettes','media','Palette'),
('media','brandKits','media','Brand kit'),('wallpapers','$','media','Wallpaper'),
('report-outlines','$','documents','Report outline');

DROP VIEW IF EXISTS BrowseProfiles;
CREATE VIEW BrowseProfiles AS
SELECT c.Name,p.CharacterId,category.Name AS Category,t.Name AS ProfileType,
       p.Collection AS SourceCollection,p.RecordKey,p.Context,
       CASE WHEN json_type(p.DataJson)='object' THEN
         coalesce(json_extract(p.DataJson,'$.role'),json_extract(p.DataJson,'$.title'),
                  json_extract(p.DataJson,'$.occupation')) END AS Role,
       CASE WHEN json_type(p.DataJson)='object' THEN
         coalesce(json_extract(p.DataJson,'$.affiliation'),json_extract(p.DataJson,'$.organization'),
                  json_extract(p.DataJson,'$.institution'),json_extract(p.DataJson,'$.department')) END AS Institution,
       p.DataJson,p.SourcePath,p.Origin
FROM CharacterProfiles p JOIN Characters c USING(CharacterId)
JOIN ProfileCollectionCategories mapping USING(Collection)
JOIN ProfileTypes t USING(ProfileTypeId)
JOIN ContentCategories category ON category.CategoryId=t.CategoryId;

CREATE VIEW IF NOT EXISTS BrowseWorldCatalog AS
SELECT c.Name AS Category,m.RecordType,r.Name,r.Description,r.RecordKey,
       r.DataJson,r.SourcePath,r.Section,r.Domain
FROM WorldRecords r JOIN WorldCategoryMappings m USING(Domain,Section)
JOIN ContentCategories c USING(CategoryId);

DROP VIEW IF EXISTS MediaCatalog;
CREATE VIEW MediaCatalog AS
SELECT * FROM BrowseWorldCatalog WHERE Category='Media';

CREATE VIEW IF NOT EXISTS BrowseCategorySummary AS
SELECT c.CategoryId,c.Name,
       CASE WHEN c.CategoryId='people' THEN (SELECT count(*) FROM Characters)
       ELSE (SELECT count(*) FROM WorldRecords r JOIN WorldCategoryMappings m USING(Domain,Section)
             WHERE m.CategoryId=c.CategoryId) END AS RecordCount
FROM ContentCategories c;

-- Resolve only unambiguous keys. Cases, institutions, and places are not people.
CREATE VIEW IF NOT EXISTS CharacterReferenceKeys AS
SELECT CharacterId AS ReferenceId,CharacterId FROM Characters
UNION SELECT LegacyId,CharacterId FROM CharacterLegacyIds
UNION SELECT RecordKey,CharacterId FROM CharacterProfiles WHERE Collection<>'seedRelationships'
UNION SELECT json_extract(DataJson,'$.id'),CharacterId FROM CharacterProfiles
      WHERE Collection<>'seedRelationships' AND json_type(DataJson)='object'
      AND json_extract(DataJson,'$.id') IS NOT NULL;

CREATE VIEW IF NOT EXISTS ResolvedCharacterReferences AS
SELECT ReferenceId,min(CharacterId) AS CharacterId FROM CharacterReferenceKeys
GROUP BY ReferenceId HAVING count(DISTINCT CharacterId)=1;
