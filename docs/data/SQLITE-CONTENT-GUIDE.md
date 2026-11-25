# Consolidated game content database

Open `E:\MiraverseOSx\miraverse.db` in DB Browser for SQLite. The legacy schema
had ten tables with no rows. Authored game content lives primarily in JSON files
and TypeScript; this migration starts by copying the structured JSON into SQLite.

## Finding the imported data

Choose **Browse Data**, then select a table or view from the dropdown:

| Table or view | Contents |
| --- | --- |
| BrowseCharacters | Names, canonical IDs, aliases, profile counts and notes |
| Characters | The 76 canonical identities and their basic fields |
| BrowseProfiles | The 120 profiles, joined to character names, roles and institutions |
| CharacterProfiles | Complete current and original profiles across 19 collections |
| CharacterAliases | Alternate names; these are not new citizens |
| CharacterLegacyIds | Seven retired IDs redirected to the existing identities |
| CharacterRelationships | Authored relationship records with original endpoint IDs |
| PlacesCatalog | Realms, landmarks and venues |
| OrganizationsCatalog | Royal lineages, color houses, institutions and brands |
| HistoryCatalog | Eras and lore entries |
| ObjectsCatalog | Authored objects |
| CareersCatalog | Current career catalogue |
| MissionsCatalog | Mission metadata and the Broad Street assignment |
| CasesCatalog | Case documents and supporting records, preserved in source context |
| MediaCatalog | Asset metadata, brand kits and templates |
| WorldRecords | All indexed catalogue records, including other small catalogues |
| SourceDocuments | Reference text from docs, including npc_profiles.docx and Game Doc.docx |
| ContentSources | Complete source JSON and original file hashes for preservation checks |
| MigrationInventory | Source locations, import status and files requiring further review |

The old NPCs, Regions, Factions and other legacy tables remain as they were.
The new canonical identities are in **Characters**, not the old **NPCs** table.
Views are convenient for browsing; DB Browser normally edits the underlying tables.
Complex profiles retain JSON so clinical details, array-valued phone threads,
source-specific statuses and original records are not discarded or flattened.
Read **DataJson** as the current profile and **OriginalJson** as immutable history.

## Migration status and editing

This is the first, verified database copy, not a completed runtime cutover.
The frontend still reads its existing authored files. Database edits will not yet
appear in the running game. Keep the source files until a reviewed export or
database reader replaces those paths. Do not manually maintain both versions.

The migration is repeatable when content is unchanged. It refuses to overwrite
existing imported records if either the database or source has changed. There is
no force-reset flag. Database edits and source changes need an explicit reconciliation
before the next import. No source deletions are applied automatically.

TypeScript files are inventoried for review, not executed or claimed to be imported.
That includes additional medical, workplace, schedule, item and event definitions.
Generated identity indexes and loaders are not imported as additional people.
Documents are reference material, not automatically accepted new characters.
PDFs are listed by path and hash; their text was not extracted.

## Existing runtime storage

`Program.cs` defaults live storage to `%LOCALAPPDATA%\MiraverseOSx` unless launched
with `--data-dir`. That directory contains `world-saves.db`, `ai-memory.db`, and
`media-assets.db`. These are separate from authored defaults and are not moved,
reset, or copied into the content tables. Browser storage may also contain state.

The original profile context remains authoritative for clinical/case facts. An
active professional record and a deceased case record do not set a single global
life status. Knowing a character ID does not grant access to hidden information.
The legacy public JSON exporter explicitly excludes these new authoring tables.

## Repeating or checking the import

Use a Python installation with SQLite support, such as the Simulation Lab environment:

```powershell
& 'E:\Miraverse Simulation Lab\.venv\Scripts\python.exe' scripts\migrate_content_to_sqlite.py --check
```

A new import into an existing database requires a backup directory:

```powershell
& 'E:\Miraverse Simulation Lab\.venv\Scripts\python.exe' scripts\migrate_content_to_sqlite.py --backup-dir '<backup directory>'
```

Backups use SQLite's consistent backup API, which includes committed WAL contents.
Import, reference checks, and data verification run in one transaction. The audit
compares complete imported records, checks foreign keys, and checks SQLite integrity.

Next stages: reconcile remaining embedded definitions, choose database ownership
per domain, add a validated publishing path to the frontend, then connect Mesa.
