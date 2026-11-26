-- Consolidated authored content. Runtime worlds and AI memories stay separate.
CREATE TABLE IF NOT EXISTS ContentMigrations (
    Version INTEGER PRIMARY KEY, Description TEXT NOT NULL
);
INSERT OR IGNORE INTO ContentMigrations VALUES (1, 'Lossless authored-content import');

CREATE TABLE IF NOT EXISTS ContentSources (
    Path TEXT PRIMARY KEY,
    Category TEXT NOT NULL,
    Sha256 TEXT NOT NULL,
    ContentJson TEXT NOT NULL CHECK(json_valid(ContentJson))
);
CREATE TABLE IF NOT EXISTS Characters (
    CharacterId TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Kind TEXT NOT NULL,
    Status TEXT NOT NULL,
    Folder TEXT NOT NULL UNIQUE,
    Maid TEXT,
    NotesJson TEXT NOT NULL CHECK(json_valid(NotesJson)),
    SourcePath TEXT NOT NULL REFERENCES ContentSources(Path),
    FirstName TEXT,
    LastName TEXT,
    Title TEXT,
    Occupation TEXT,
    HomeRealm TEXT
);
-- Names remain distinct; aliases and role-qualified identities are preserved.
CREATE UNIQUE INDEX IF NOT EXISTS UX_Characters_Name ON Characters(lower(trim(Name)));
CREATE UNIQUE INDEX IF NOT EXISTS UniqueCharacterMAID
ON Characters (UPPER(TRIM(Maid)))
WHERE Maid IS NOT NULL
AND TRIM(Maid) != '';

CREATE TABLE IF NOT EXISTS RetiredCharacters (
    CharacterId TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Folder TEXT,
    Reason TEXT NOT NULL,
    HistoricalContext TEXT,
    RetiredAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS MaidRegistry (
    Maid TEXT PRIMARY KEY,
    RegionCode TEXT NOT NULL CHECK(RegionCode IN ('OR','FR','LU','MA','BR','KA','NE','VR')),
    SerialNumber INTEGER NOT NULL,
    CharacterId TEXT REFERENCES Characters(CharacterId) ON DELETE SET NULL,
    Status TEXT NOT NULL CHECK(Status IN ('active','retired','reserved')),
    IssuedAt TEXT NOT NULL DEFAULT (datetime('now')),
    RetiredAt TEXT,
    Notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS UX_MaidRegistry_Normalized
    ON MaidRegistry(UPPER(TRIM(Maid)));
CREATE INDEX IF NOT EXISTS IX_MaidRegistry_RegionSerial
    ON MaidRegistry(RegionCode, SerialNumber);
CREATE INDEX IF NOT EXISTS IX_MaidRegistry_Character
    ON MaidRegistry(CharacterId) WHERE CharacterId IS NOT NULL;

CREATE TABLE IF NOT EXISTS MaidRetiredSerials (
    SerialNumber INTEGER PRIMARY KEY,
    Maid TEXT,
    Reason TEXT NOT NULL,
    RetiredAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS MaidSequences (
    RegionCode TEXT PRIMARY KEY CHECK(RegionCode IN ('OR','FR','LU','MA','BR','KA','NE','VR')),
    NextSerial INTEGER NOT NULL CHECK(NextSerial >= 1),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS CharacterAliases (
    CharacterId TEXT NOT NULL REFERENCES Characters(CharacterId),
    Alias TEXT NOT NULL,
    Position INTEGER NOT NULL,
    PRIMARY KEY(CharacterId, Alias)
);
CREATE TABLE IF NOT EXISTS CharacterLegacyIds (
    LegacyId TEXT PRIMARY KEY,
    CharacterId TEXT NOT NULL REFERENCES Characters(CharacterId),
    Position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS CharacterProfiles (
    Collection TEXT NOT NULL,
    RecordKey TEXT NOT NULL,
    CharacterId TEXT NOT NULL REFERENCES Characters(CharacterId),
    Context TEXT NOT NULL,
    Origin TEXT NOT NULL,
    SourcePath TEXT NOT NULL REFERENCES ContentSources(Path),
    SourceIndex INTEGER NOT NULL,
    CollectionOrder INTEGER NOT NULL UNIQUE,
    DataJson TEXT NOT NULL CHECK(json_valid(DataJson)),
    OriginalJson TEXT NOT NULL CHECK(json_valid(OriginalJson)),
    PRIMARY KEY(Collection, RecordKey)
);
CREATE INDEX IF NOT EXISTS IX_CharacterProfiles_Person ON CharacterProfiles(CharacterId);
CREATE TABLE IF NOT EXISTS WorldRecords (
    SourcePath TEXT NOT NULL REFERENCES ContentSources(Path),
    Section TEXT NOT NULL,
    RecordKey TEXT NOT NULL,
    Position INTEGER NOT NULL,
    Domain TEXT NOT NULL,
    Name TEXT,
    Description TEXT,
    DataJson TEXT NOT NULL CHECK(json_valid(DataJson)),
    PRIMARY KEY(SourcePath, Section, RecordKey)
);
CREATE INDEX IF NOT EXISTS IX_WorldRecords_Domain ON WorldRecords(Domain, Section);
CREATE TABLE IF NOT EXISTS SourceDocuments (
    Path TEXT PRIMARY KEY,
    Format TEXT NOT NULL,
    Sha256 TEXT NOT NULL,
    Text TEXT,
    Status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS MigrationInventory (
    Path TEXT PRIMARY KEY,
    Category TEXT NOT NULL,
    Status TEXT NOT NULL,
    Notes TEXT NOT NULL
);

-- Readable views join the existing identities without exposing them to apps.
DROP VIEW IF EXISTS BrowseCharacters;
CREATE VIEW BrowseCharacters AS
SELECT c.CharacterId, c.Name, c.FirstName, c.LastName, c.Title,
       c.Occupation, c.HomeRealm, c.Kind, c.Status, c.Maid, c.Folder,
       (SELECT group_concat(Alias, '; ') FROM CharacterAliases a
        WHERE a.CharacterId=c.CharacterId) AS Aliases,
       (SELECT count(*) FROM CharacterProfiles p
        WHERE p.CharacterId=c.CharacterId) AS ProfileCount,
       c.NotesJson
FROM Characters c;
CREATE VIEW IF NOT EXISTS BrowseProfiles AS
SELECT c.Name, p.CharacterId, p.Collection, p.RecordKey, p.Context,
       CASE WHEN json_type(p.DataJson)='object' THEN
         coalesce(json_extract(p.DataJson,'$.role'),json_extract(p.DataJson,'$.title'),
                  json_extract(p.DataJson,'$.occupation')) END AS Role,
       CASE WHEN json_type(p.DataJson)='object' THEN
         coalesce(json_extract(p.DataJson,'$.affiliation'),json_extract(p.DataJson,'$.organization'),
                  json_extract(p.DataJson,'$.institution'),json_extract(p.DataJson,'$.department')) END AS Institution,
       p.DataJson, p.SourcePath, p.Origin
FROM CharacterProfiles p JOIN Characters c USING(CharacterId);
CREATE VIEW IF NOT EXISTS PlacesCatalog AS SELECT * FROM WorldRecords WHERE Domain='places';
CREATE VIEW IF NOT EXISTS OrganizationsCatalog AS SELECT * FROM WorldRecords WHERE Domain='organizations';
CREATE VIEW IF NOT EXISTS HistoryCatalog AS SELECT * FROM WorldRecords WHERE Domain='history';
CREATE VIEW IF NOT EXISTS ObjectsCatalog AS SELECT * FROM WorldRecords WHERE Domain='objects';
CREATE VIEW IF NOT EXISTS CareersCatalog AS SELECT * FROM WorldRecords WHERE Domain='careers';
CREATE VIEW IF NOT EXISTS MissionsCatalog AS SELECT * FROM WorldRecords WHERE Domain='missions';
CREATE VIEW IF NOT EXISTS CasesCatalog AS SELECT * FROM WorldRecords WHERE Domain='cases';
CREATE VIEW IF NOT EXISTS MediaCatalog AS SELECT * FROM WorldRecords WHERE Domain='media';
