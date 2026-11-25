# Startup, Database Versioning, and Desktop Packaging Plan

## Context

Verified against the working tree (branch `0823715e`, many staged migration changes):

- **Root launcher broken**: root `node_modules` is absent; `concurrently` (root devDependency) cannot resolve. `package.json:7,9` (`prestart`/`start`) require it. `frontend/node_modules` is present, so services can run while the normal launcher cannot.
- **Build output not self-contained**: `bin/Debug/net8.0` contains `simulation/` and `runtimes/` but **no `wwwroot`** and **no `miraverse.db`**. Root cause: `MiraverseOSx.csproj:26` uses `<None Update="wwwroot\**\*">` (matches nothing, copies nothing) and `miraverse.db` is not referenced at all. `Program.cs:120` and `ObservatoryApi.cs:22` fall back to CWD, so launching from the repo works but launching the exe from its output folder does not.
- **DB/WAL tracked**: `miraverse.db`, `miraverse.db-shm`, `miraverse.db-wal` are all tracked; `.gitignore` does not exclude them. The DB is both the read-only population source and the simulation run store (not trivially regenerable).
- Port conflict (frontend vite `3000` vs orchestrator `3000`) and doc/tracker cleanup are **out of scope** for this plan.

## Decisions (confirmed)

1. Scope = review items **1–3 only**.
2. DB policy = **keep `miraverse.db` tracked**, ignore/untrack `-wal`/`-shm`, checkpoint WAL before committing.
3. Packaging = **self-contained Debug output** (`bin/Debug/net8.0` gets `wwwroot` + `miraverse.db`); no publish profile.

## Out of Scope

Items 4–6: player/Living World state ownership and synchronization, connecting a player→simulation workflow, consolidating duplicate registries/legacy state, retiring the orchestrator launch path, and documentation/tracker cleanup.

## Tasks

### Item 1 — Restore root launcher and verify one repeatable startup

1. Run `npm install` at repo root. Confirm `node_modules/.bin/concurrently` exists.
2. Confirm `frontend/node_modules` exists (it does); if missing on another machine, run `npm install --prefix frontend`.
3. Ensure `wwwroot` is populated before a backend build: run `npm run build` (frontend `vite build` → `wwwroot`, then `dotnet build`). `wwwroot` currently exists but is a build artifact.
4. From repo root run `npm start`. `prestart` builds the backend, then `concurrently` starts:
   - backend `dotnet bin/Debug/net8.0/MiraverseOSx.dll --server-only --port 5000`
   - frontend `vite` on `http://localhost:3000` (strictPort).
5. Verify: both processes start, `http://localhost:3000` loads the OS, and no `concurrently`/`@tanstack/react-query` resolution error appears.
6. If `npm install` changes `package-lock.json`, keep the updated lock in the checkpoint commit.

### Item 2 — Database backup/versioning policy and checkpoint the migration

1. Append to `.gitignore`:
   ```
   miraverse.db-wal
   miraverse.db-shm
   ```
2. Untrack the live sidecars: `git rm --cached miraverse.db-wal miraverse.db-shm`.
3. Checkpoint the WAL so the tracked `miraverse.db` is compacted/consistent (use the repo `.venv` or system Python):
   ```
   python -c "import sqlite3; c=sqlite3.connect('miraverse.db'); print(c.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()); c.close()"
   ```
   Confirm `-wal`/`-shm` are gone or zero-length.
4. Stage and commit the migration checkpoint: `git add miraverse.db .gitignore package-lock.json` (plus the already-staged migration files), then commit with a clear message (e.g. `Checkpoint Living World migration; track DB, ignore WAL/SHM`). **Commit only with explicit user approval.**
5. Optional (policy coherence): add a one-paragraph "Database versioning" note to `simulation/README.md` stating the DB is tracked, WAL/SHM are ignored, and a checkpoint is required before commit.

### Item 3 — Self-contained Debug output

1. Edit `MiraverseOSx.csproj` (lines 26–28): replace the `None Update` block with content items that actually copy:
   ```xml
   <Content Include="wwwroot\**\*" CopyToOutputDirectory="PreserveNewest" CopyToPublishDirectory="PreserveNewest" />
   <Content Include="miraverse.db" CopyToOutputDirectory="PreserveNewest" CopyToPublishDirectory="PreserveNewest" />
   ```
   Keep the existing `simulation\*.py`, `requirements*.txt`, and `places.json` content lines.
2. Build: `dotnet build` (or `npm run build`). Verify `bin/Debug/net8.0/wwwroot` and `bin/Debug/net8.0/miraverse.db` now exist.
3. Verify independent launch: start `bin/Debug/net8.0/MiraverseOSx.exe` with the output folder as the working directory. Confirm the desktop window loads the app from the local server, Observatory endpoints read the bundled DB, and no `FileNotFoundException` for the canonical database is logged.
4. Note: the Python Living World autostart still needs `.venv` (or `MIRAVERSE_PYTHON`) with deps installed; if absent the host logs a warning and the OS still runs. This is already documented in `simulation/README.md`.

## Risks

- Copying `miraverse.db` while a WAL is active yields a stale/inconsistent copy → do Item 2 checkpoint before Item 3 build.
- `Content Include="wwwroot\**\*"` combined with vite `emptyOutDir: true`: always run the frontend build before `dotnet build` so `wwwroot` is fully repopulated.
- Committing the DB is a large binary diff; the checkpoint keeps it compact and prevents WAL drift.
- Root `npm install` may modify `package-lock.json`; include it in the checkpoint.

## Validation

- `npm install` then `npm start` from repo root: backend `:5000` + frontend `:3000` both up, app loads.
- `dotnet build` then confirm `bin/Debug/net8.0/wwwroot` and `bin/Debug/net8.0/miraverse.db` exist.
- Launch `MiraverseOSx.exe` from `bin/Debug/net8.0` and confirm the app + Observatory work with no missing-file errors.
- `git status` shows WAL/SHM untracked and the checkpoint commit contains the intended files only.

## Open Questions

None.