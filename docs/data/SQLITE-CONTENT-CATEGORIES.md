# Content categories and duplicate screening

The working database is `E:\MiraverseOSx\miraverse.db`.

The second migration screens the imported data, gives it consistent browsing
categories, and removes redundant relationship storage. No NPC names are changed,
no characters are deleted, and aliases remain attached to their existing IDs.

## Browse the organized records

| View | Purpose |
| --- | --- |
| BrowseCategorySummary | The 11 top-level categories and their record counts |
| BrowseCharacters | One row per canonical identity |
| BrowseProfiles | Human-readable category and profile type alongside original source references |
| BrowseWorldCatalog | Human-readable category and record type for every catalogue entry |
| CharacterRelationships | Relationships derived from their owning profile records |

The top-level categories are People, Places, Organizations, Careers, Missions,
Investigations, History, Media, Objects, Documents, and Generation resources.

People have 11 profile types: Background, Social, Communications, Dialogue,
Identity registry, Employment, Agency, Relationships, Story, Investigation context,
and Medical context. These replace source collection labels in the main browsing
experience; they do not erase the original collection keys used by game code.

For example, email and phone profiles share Communications. Agency sources share
Agency, case-specific profiles share Investigation context, and medical chart and
care-assignment sources share Medical context. Sources and contexts remain visible
so facts from one case are not treated as global facts about that person.

World records have category-specific types: realms, landmarks, venues, institutions,
royal lineages, color houses, careers, missions, case documents, eras, lore entries,
objects, palettes, fonts, brand kits, templates, assets, wallpapers and report outlines.
Dictionary-valued palettes and brand kits are now individually indexed. They had
already been retained in full in ContentSources before this indexing correction.

## Duplicate and consistency rules

- Canonical names must be unique after trimming and ignoring ASCII case. A unique
  database index enforces this during ordinary edits. The screening check also
  detects Unicode case and whitespace equivalents.
- Aliases and retired IDs are references, not additional people.
- Similar first names or surnames are not sufficient grounds to merge identities.
- The two Marcus Vance records keep their existing distinct display names and IDs.
- Repeated appearances across different professional, social, story or case profiles
  are not discarded. Exact repeated records within a person's profiles are flagged.
- Unmapped profile collections or world sections fail the category coverage check.
- Original source snapshots and OriginalJson are provenance, not editable live copies.
- CharacterRelationships is now a view of CharacterProfiles. Editing the owning
  relationship profile updates its browsable relationship automatically. The upgrade
  verifies every old relationship value before committing the conversion.
- Relationship targets can be cases, organizations or places. A missing target
  CharacterId is expected for those targets and does not justify inventing a person.

The imported profiles and authored catalogues remain unchanged except for indexing
previously unlisted palette and brand-kit records. Profile data and original records
are compared to their source files after the cleanup. The upgrade is transactional,
and a consistent SQLite backup is made before changing the existing database.

This remains a staged authoring database. The game still reads existing source
files; database changes are not published to gameplay yet. Embedded definitions
remain recorded for later review. Player saves and NPC memories are separate.

To verify again, run `scripts/migrate_content_to_sqlite.py --check` using the
Simulation Lab Python environment. Checks include SQLite integrity, foreign keys,
complete source equality, duplicate screening and full category coverage.
