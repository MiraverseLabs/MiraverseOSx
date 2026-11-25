-- Review workspace for extracted data. Does not replace canonical identities.
CREATE TABLE IF NOT EXISTS ProjectFiles (
    Path TEXT PRIMARY KEY, FileType TEXT NOT NULL, ByteSize INTEGER NOT NULL,
    Treatment TEXT NOT NULL, Notes TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ProjectSourceArchive (
    Path TEXT PRIMARY KEY, Language TEXT NOT NULL, Sha256 TEXT NOT NULL,
    SourceText TEXT NOT NULL, ExtractionStatus TEXT NOT NULL,
    ErrorsJson TEXT NOT NULL CHECK(json_valid(ErrorsJson))
);
CREATE TABLE IF NOT EXISTS EmbeddedPayloads (
    PayloadHash TEXT PRIMARY KEY,
    DataJson TEXT NOT NULL CHECK(json_valid(DataJson))
);
CREATE TABLE IF NOT EXISTS CodeDefinitions (
    DefinitionId TEXT PRIMARY KEY,
    SourcePath TEXT NOT NULL REFERENCES ProjectSourceArchive(Path),
    Name TEXT NOT NULL, Scope TEXT NOT NULL, Kind TEXT NOT NULL,
    StartLine INTEGER NOT NULL, EndLine INTEGER NOT NULL,
    StartOffset INTEGER NOT NULL, NodeType TEXT NOT NULL,
    Completeness TEXT NOT NULL CHECK(Completeness IN ('literal','partial','expression')),
    UnresolvedExpressions INTEGER NOT NULL,
    SourceText TEXT NOT NULL,
    PayloadHash TEXT NOT NULL REFERENCES EmbeddedPayloads(PayloadHash)
);
CREATE INDEX IF NOT EXISTS IX_CodeDefinitions_Source ON CodeDefinitions(SourcePath,StartLine);
CREATE TABLE IF NOT EXISTS EmbeddedRecords (
    RecordId TEXT PRIMARY KEY,
    DefinitionId TEXT NOT NULL REFERENCES CodeDefinitions(DefinitionId),
    RecordKey TEXT NOT NULL, Name TEXT NOT NULL,
    CategoryId TEXT NOT NULL REFERENCES ContentCategories(CategoryId),
    RecordType TEXT NOT NULL,
    PayloadHash TEXT NOT NULL REFERENCES EmbeddedPayloads(PayloadHash),
    ReviewStatus TEXT NOT NULL,
    CanonicalCharacterId TEXT REFERENCES Characters(CharacterId),
    IdentityMatch TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IX_EmbeddedRecords_Category ON EmbeddedRecords(CategoryId,ReviewStatus);
CREATE TABLE IF NOT EXISTS CodeTextFragments (
    SourcePath TEXT NOT NULL REFERENCES ProjectSourceArchive(Path),
    StartOffset INTEGER NOT NULL, Line INTEGER NOT NULL,
    Kind TEXT NOT NULL, Context TEXT NOT NULL, Text TEXT NOT NULL,
    PRIMARY KEY(SourcePath,StartOffset,Kind)
);
INSERT OR IGNORE INTO ContentCategories VALUES
('medical','Medical'),('gameplay','Gameplay rules'),('interface','Interface content'),
('simulation','Simulation defaults'),('system','System definitions'),('reference','Reference material');

CREATE VIEW IF NOT EXISTS BrowseEmbeddedData AS
SELECT c.Name AS Category,r.RecordType,r.Name,r.ReviewStatus,r.CanonicalCharacterId,
       r.IdentityMatch,d.Name AS DefinitionName,d.Scope,d.Completeness,
       d.UnresolvedExpressions,d.SourcePath,d.StartLine,d.EndLine,
       p.DataJson,d.SourceText,r.RecordId
FROM EmbeddedRecords r JOIN CodeDefinitions d USING(DefinitionId)
JOIN EmbeddedPayloads p ON p.PayloadHash=r.PayloadHash
JOIN ContentCategories c USING(CategoryId);

CREATE VIEW IF NOT EXISTS BrowseCodeDefinitions AS
SELECT d.Name,d.Kind,d.Scope,d.Completeness,d.UnresolvedExpressions,d.SourcePath,
       d.StartLine,d.EndLine,p.DataJson,d.SourceText
FROM CodeDefinitions d JOIN EmbeddedPayloads p USING(PayloadHash);

CREATE VIEW IF NOT EXISTS BrowsePeopleToReview AS
SELECT * FROM BrowseEmbeddedData
WHERE Category='People' AND CanonicalCharacterId IS NULL AND ReviewStatus<>'runtime-expression'
AND (json_type(DataJson,'$.name')='text' OR json_type(DataJson,'$.npc')='text');

CREATE VIEW IF NOT EXISTS BrowseExtractionIssues AS
SELECT Path,ExtractionStatus,ErrorsJson FROM ProjectSourceArchive
WHERE ExtractionStatus IN ('parse-error','partial-parse','source-only');

CREATE VIEW IF NOT EXISTS BrowseEmbeddedSummary AS
SELECT c.Name AS Category,count(*) AS RecordOccurrences,
       count(DISTINCT r.PayloadHash) AS DistinctPayloads,
       sum(r.ReviewStatus='existing-data-reference') AS ExistingDataReferences,
       sum(r.ReviewStatus='runtime-expression') AS RuntimeExpressions
FROM EmbeddedRecords r JOIN ContentCategories c USING(CategoryId)
GROUP BY r.CategoryId;

CREATE VIEW IF NOT EXISTS BrowseAllContent AS
SELECT 'Canonical character' AS RecordType,'People' AS Category,c.Name,
       'canonical' AS ReviewStatus,c.CharacterId AS RecordId,c.SourcePath,
       NULL AS SourceLine,s.ContentJson AS DataJson
FROM Characters c JOIN ContentSources s ON s.Path=c.SourcePath
UNION ALL
SELECT r.RecordType,r.Category,r.Name,'canonical',
       r.SourcePath||'#'||r.Section||'/'||r.RecordKey,r.SourcePath,NULL,r.DataJson
FROM BrowseWorldCatalog r
UNION ALL
SELECT r.RecordType,r.Category,r.Name,r.ReviewStatus,r.RecordId,r.SourcePath,r.StartLine,r.DataJson
FROM BrowseEmbeddedData r;

DROP VIEW IF EXISTS BrowseCategorySummary;
CREATE VIEW BrowseCategorySummary AS
SELECT c.CategoryId,c.Name,
       CASE WHEN c.CategoryId='people' THEN (SELECT count(*) FROM Characters)
       ELSE (SELECT count(*) FROM WorldRecords r JOIN WorldCategoryMappings m USING(Domain,Section)
             WHERE m.CategoryId=c.CategoryId) END AS RecordCount,
       (SELECT count(*) FROM EmbeddedRecords e WHERE e.CategoryId=c.CategoryId) AS EmbeddedRecordOccurrences,
       (SELECT count(DISTINCT e.PayloadHash) FROM EmbeddedRecords e WHERE e.CategoryId=c.CategoryId) AS DistinctEmbeddedPayloads
FROM ContentCategories c;
