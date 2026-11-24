# Orynvell Public Records (`records.orynvell.gov`)
## Institutional Website Design & Implementation Summary (v1.0)

- **Institution:** Orynvell Public Records Administration (Hybrid Jurisdiction: Central Records Administration, Municipal/Regional Offices, Affiliated Institutional Sources).
- **Palette:** Soft White `#F5F4F2`, Pale Cloud `#E7ECF3`, Mist Blue `#D7E0E5`, Silver Gray `#AAB0B8`, Institutional Navy `#233B54`.
- **Six Service Divisions:** Land & Property Records, Civil Registration & Identity Records, Licensing/Permits/Public Filings, Government Archives & Publications, Records Access & Disclosure, Public Services & Records Administration.
- **Eight Record Categories:** Property & Land, Civil Registration, Business & Organizations, Permits & Licensing, Government Proceedings, Planning & Infrastructure, Government Archives, Government Publications.
- **Access & Custodianship:** Four custodianship relationships (`Primary Custodian`, `Authorized Repository`, `Connected Source`, `Reference Only`), independent status dimensions, and access-aware discovery (`publicly-indexed`, `limited-index`, `non-discoverable`).
- **Public & Staff Workflows:** 6 public sections (`Home`, `Records`, `Services`, `My Requests`, `Departments`, `Help & Policies`) + role-gated Staff Workspace (`Queue`, `Records`, `Audit Log`) with version-preserving amendments, certified issuance, NPC session-tick processing, ORYN fee handling, and Fylo document saving.

### Source Files
- Model & Simulation: `frontend/src/apps/Browser/records/orynvellRecordsModel.ts`
- Website & Staff UI: `frontend/src/apps/Browser/records/OrynvellRecordsSite.tsx`, `orynvell-records.css`
- Store Integration: `frontend/src/store/useOSStore.ts`
- Unit Tests: `frontend/tests/orynvell-records.test.mjs`
