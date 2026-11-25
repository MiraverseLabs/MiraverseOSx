# Living World simulation

This directory owns the Python engine, HTTP service, and Solara Observatory.
The sibling `Miraverse Simulation Lab` directory is no longer required. The
repository's `.venv` holds Python dependencies and `simulation/state/` holds
local staged edits. Both are ignored by Git.

## Data ownership

- Canonical character profiles are read from `miraverse.db`; simulation actions
  do not write back to those profile tables. Explicit editor profile commits
  remain a separate workflow.
- `PopulationModel` owns each run's clock, calendar, RNG, citizen runtime state,
  employment, schedules, balances, and savings. Services operate on this model.
- `LivingWorldRuns` stores the snapshot and revision. `LivingWorldTransactions`
  stores the ledger. A checkpoint saves both in one SQLite transaction.
- Events, entertainment records, and opaque extension data survive engine saves.
  Unknown saved citizen IDs are retained when the current source population differs.
- The .NET `/api/livingworld` endpoint proxies this service, including query strings
  and HTTP errors. It does not maintain another simulation state.

This unifies the API and Observatory's experimental runs. It does not merge the
OS player's Zustand save, WORKNET receipts, or canonical profiles into those runs.

## Running

From the repository root, create the local environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r simulation/requirements-observatory.txt
.\.venv\Scripts\python.exe simulation/living_world_api.py --port 5010
# In a separate terminal, keep Solara's file watcher scoped to the Python source:
Set-Location simulation
..\.venv\Scripts\solara.exe run dashboard.py --host 127.0.0.1 --port 8768 --no-open --no-check-version
```

For API-only installations, `requirements.txt` is sufficient. The .NET host
automatically starts the versioned API if its port is available. A host shutdown
terminates only the service process that host started.

Configuration is shared through environment variables, set before launch:

| Variable | Default / purpose |
| --- | --- |
| `MIRAVERSE_REPOSITORY` | Parent of this directory |
| `MIRAVERSE_SOURCE_DATABASE` | Repository `miraverse.db`, read-only population source |
| `MIRAVERSE_RUN_DATABASE` | Source database; use a separate SQLite path for isolated experiments |
| `MIRAVERSE_WORLD_REFERENCE` | Repository `places.json`, then packaged `simulation/content/places.json` |
| `MIRAVERSE_SIMULATION_STATE_DIRECTORY` | `simulation/state/` |
| `MIRAVERSE_OVERRIDES_FILE` | State directory `staged_population_overrides.json` |
| `MIRAVERSE_PYTHON` | .NET interpreter override; otherwise repository/packaged `.venv`, then `python` |
| `MIRAVERSE_SIMULATION_DIRECTORY` | .NET script directory override |
| `MIRAVERSE_LIVINGWORLD_PORT` | `5010` |
| `MIRAVERSE_LIVINGWORLD_AUTOSTART` | Set `0` to manage the service separately |

Explicit missing source paths fail instead of creating an empty canonical database.
The .NET build/publish includes Python source, dependency manifests, and geography;
install the Python dependencies separately on a new machine.

## API and concurrency

Both short service routes and `/api/livingworld/...` routes are accepted. The .NET
proxy exposes the latter. GET requests do not checkpoint runs.

`POST /runs/{id}/advance` accepts `steps` (integer 1–1440), executes real citizen
steps, and atomically checkpoints the entire batch. Commands may supply an integer
`expectedRevision`; stale revisions return HTTP 409. Every model checkpoint also
compares the loaded revision, including writes from another process. The Observatory
pauses and reloads after conflicts so the user can retry against current state.

Raw `/runs/{id}/save` requires `expectedRevision` and permits extension metadata
updates, not replacement of managed citizen, clock, or service state. Use domain
commands for those changes. Financial commands can supply `requestId`; a matching
retry returns its existing receipt, while reuse with different payment data fails.
Invalid citizens, nonfinite numbers, and overdrafts are rejected before saving.

Legacy top-level accounts were zero-based service balances, separate from the
engine's opening balances. On migration their known-citizen values are applied as
deltas once, then removed from the active account representation. Exact originals,
including unmatched IDs, remain under `legacy_service_state.accounts`. Historical
career assignments become active employment; their salary is daily gross income
subject to the engine's existing pay timing and deductions. Legacy transaction
history remains separately visible rather than being paid again.

## Verification

Tests use temporary databases and fixture citizens:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s simulation/tests -p 'test_*.py'
dotnet build tests/LivingWorldBridgeTests/LivingWorldBridgeTests.csproj -o "$env:TEMP\miraverse-proxy-tests"
$env:MIRAVERSE_PROXY_DLL = "$env:TEMP\miraverse-proxy-tests\LivingWorldBridgeTests.dll"
.\.venv\Scripts\python.exe -m unittest discover -s simulation/tests -p 'test_*.py'
node simulation/tests/verify_navigation.mjs
```

The first command runs 14 tests and skips four optional .NET proxy checks. With the
harness configured all 18 execute. The navigation check requires the Observatory
on port 8768 (or `OBSERVATORY_URL`) and the frontend's installed Playwright package.
It switches all five pages, exercises paginated cross-page navigation, search, and
editor tabs, and rejects unexpected browser errors. It does not commit profiles.
Reports and screenshots go to ignored `simulation/output/`.
