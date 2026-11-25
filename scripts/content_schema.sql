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
    SourcePath TEXT NOT NULL REFERENCES ContentSources(Path)
);
-- Names remain distinct; aliases and role-qualified identities are preserved.
CREATE UNIQUE INDEX IF NOT EXISTS UX_Characters_Name ON Characters(lower(trim(Name)));
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
CREATE VIEW IF NOT EXISTS BrowseCharacters AS
SELECT c.CharacterId, c.Name, c.Kind, c.Status, c.Maid, c.Folder,
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
