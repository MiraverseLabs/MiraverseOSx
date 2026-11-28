"""MiraverseOSx Population Manager — Interactive & Reusable CLI Utility.

Reuses DynamicPopulationManager, PopulationBatchRequest, GeneratedCitizenRecord,
preview_batch, preview_deficit_fill, commit_batch, and authoritative MAID allocation.
All preview operations run against an isolated SQLite backup and never modify miraverse.db.
Persistent commits require explicit user approval and create a timestamped SQLite backup first.
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
from collections import Counter
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

SIM_DIR = Path(__file__).resolve().parent
REPO_ROOT = SIM_DIR.parent
if str(SIM_DIR) not in sys.path:
    sys.path.insert(0, str(SIM_DIR))

import dynamic_population
from dynamic_population import (
    ALL_OCCUPATIONS,
    DEMAND_SECTORS,
    DynamicPopulationManager,
    NAMING_STYLES,
    PopulationBatchRequest,
    REALM_METADATA,
    RESIDENCY_TYPES,
    SIMULATION_DEPTHS,
    calculate_population_deficits,
    ensure_population_schema,
)
import paths
from paths import SOURCE_DATABASE as DEFAULT_DATABASE
from population import PopulationModel, load_characters


def create_timestamped_backup(source_db: Path, backup_dir: Path | None = None) -> Path:
    """Create a verified timestamped backup using SQLite's online backup API."""
    target_dir = backup_dir or (REPO_ROOT / "backups")
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = target_dir / f"miraverse_backup_{stamp}.db"
    with closing(sqlite3.connect(source_db.resolve().as_uri() + "?mode=ro", uri=True)) as src:
        with closing(sqlite3.connect(dest)) as dst:
            src.backup(dst)
    with closing(sqlite3.connect(dest)) as check:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError(f"Backup integrity check failed for {dest}")
    return dest


def _load_isolated_model(source_db: Path, tmp_dir: Path, *, seed: int = 42) -> tuple[PopulationModel, Path]:
    """Create an isolated SQLite backup and direct both run and source DB reads to it."""
    preview_db = tmp_dir / "Population_Preview.db"
    with closing(sqlite3.connect(source_db.resolve().as_uri() + "?mode=ro", uri=True)) as src:
        with closing(sqlite3.connect(preview_db)) as dst:
            src.backup(dst)
    with closing(sqlite3.connect(preview_db)) as conn:
        ensure_population_schema(conn)
        conn.commit()

    # Load canonical characters explicitly from the isolated copy (never touching live DB)
    orig_source = paths.SOURCE_DATABASE
    import population as pop_mod
    orig_pop_source = pop_mod.SOURCE_DATABASE
    try:
        paths.SOURCE_DATABASE = preview_db
        pop_mod.SOURCE_DATABASE = preview_db
        chars = load_characters()
        model = PopulationModel(seed=seed, database=preview_db, characters=chars, persist=False)
    finally:
        paths.SOURCE_DATABASE = orig_source
        pop_mod.SOURCE_DATABASE = orig_pop_source
    return model, preview_db


def _print_preview_table(preview: dict[str, Any], *, max_rows: int = 30) -> None:
    records = preview.get("records", [])
    print(f"\nBatch ID: {preview.get('batchId')} | Valid: {preview.get('valid')} | Previewed: {len(records)}")
    if preview.get("warnings"):
        print("Warnings:")
        for w in preview["warnings"]:
            print(f"  - {w}")
    if not records:
        return
    print("-" * 110)
    print(f"{'#':>3}  {'Name':<24} {'Age':>3} {'Realm':<10} {'Occupation':<24} {'Employer / Status':<24} {'Bal':>7}")
    print("-" * 110)
    for idx, c in enumerate(records[:max_rows], start=1):
        emp = c["employer"] or c["employmentStatus"].replace("_", " ").title()
        print(
            f"{idx:>3}  {c['name'][:24]:<24} {c['age']:>3} {c['currentRealm'][:10]:<10} "
            f"{c['occupation'][:24]:<24} {emp[:24]:<24} {c['initialBalance']:>7.0f}"
        )
    if len(records) > max_rows:
        print(f"  ... ({len(records) - max_rows} additional citizens in batch; export or review full roster)")
    print("\nRealm distribution:", preview.get("realmDistribution", {}))
    print("Sector distribution:", preview.get("sectorDistribution", {}))
    print("Naming styles:", preview.get("namingStyleDistribution", {}))


def validate_database_integrity(database: Path) -> dict[str, Any]:
    with closing(sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)) as conn:
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        fk_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
        chars = conn.execute("SELECT COUNT(*) FROM Characters").fetchone()[0]
        doc_only = conn.execute("SELECT COUNT(*) FROM Characters WHERE LOWER(Status) = 'document-only'").fetchone()[0]
        maids_total = conn.execute("SELECT COUNT(*) FROM MaidRegistry").fetchone()[0]
        retired_maids = conn.execute("SELECT COUNT(*) FROM MaidRetiredSerials").fetchone()[0]
        has_gen = bool(conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'").fetchone())
        gen_count = conn.execute("SELECT COUNT(*) FROM GeneratedCitizens WHERE Status = 'active'").fetchone()[0] if has_gen else 0
        dup_maids = conn.execute(
            "SELECT UPPER(TRIM(Maid)), COUNT(*) FROM MaidRegistry GROUP BY UPPER(TRIM(Maid)) HAVING COUNT(*) > 1"
        ).fetchall()
    return {
        "integrity": integrity,
        "foreignKeyErrors": len(fk_errors),
        "canonicalCharacters": chars,
        "documentOnlyCharacters": doc_only,
        "activeGeneratedCitizens": gen_count,
        "maidRegistryRows": maids_total,
        "retiredMaidSerials": retired_maids,
        "duplicateMaids": len(dup_maids),
    }


def export_citizen_roster(database: Path, output_path: Path) -> dict[str, Any]:
    with TemporaryDirectory() as td:
        model, _ = _load_isolated_model(database, Path(td))
        rows = []
        for a in model.agents:
            rows.append(
                {
                    "characterId": a.character_id,
                    "maid": a.maid or "",
                    "name": a.name,
                    "origin": "generated" if getattr(a, "record_status", "") in ("generated", "procedural") else "canonical",
                    "residencyType": getattr(a, "residency_type", "permanent"),
                    "realm": a.realm,
                    "occupation": a.primary_occupation,
                    "employer": a.workplace,
                    "classification": a.character_classification,
                    "eligible": bool(a.eligible_for_living_sim),
                    "simulationDepth": a.simulation_depth,
                    "balance": round(float(a.balance), 2),
                }
            )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".csv":
        with output_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ["characterId"])
            writer.writeheader()
            writer.writerows(rows)
    else:
        output_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"exportedCount": len(rows), "path": str(output_path)}


class PopulationManagerCLI:
    def __init__(self, database: Path = DEFAULT_DATABASE) -> None:
        if not database.is_file():
            raise FileNotFoundError(f"Database not found: {database}")
        self.database = database
        self.pending_batches: list[dict[str, Any]] = []

    def show_statistics(self) -> dict[str, Any]:
        with TemporaryDirectory() as td:
            model, _ = _load_isolated_model(self.database, Path(td))
            summary = model.population_summary()
        print("\n=== POPULATION STATISTICS ===")
        print(f"Canonical citizens:        {summary['canonicalCount']}")
        print(f"Generated permanent:       {summary['generatedPermanentCount']}")
        print(f"Generated visitors:        {summary['generatedVisitorCount']}")
        print(f"Total simulated citizens:  {summary['totalSimulatedCitizens']} ({summary['livingCitizensCount']} living)")
        print(f"Permanent target/deficit:  {summary['totalPermanentTarget']} (deficit {summary['totalPermanentDeficit']})")
        print(f"Visitor target/deficit:    {summary['totalVisitorTarget']} (deficit {summary['totalVisitorDeficit']})")
        print(f"Abstract background pop:   {summary['totalAbstractBackgroundPopulation']:,}")
        return summary

    def show_occupations(self) -> list[dict[str, Any]]:
        with TemporaryDirectory() as td:
            model, _ = _load_isolated_model(self.database, Path(td))
            counts = Counter(str(a.primary_occupation or "Unassigned") for a in model.agents)
        print("\n=== OCCUPATIONAL DISTRIBUTION ===")
        for occ, cnt in counts.most_common(30):
            print(f"  {occ:<34} {cnt:>4}")
        return [{"occupation": k, "count": v} for k, v in counts.most_common()]

    def show_deficits(self) -> dict[str, Any]:
        with TemporaryDirectory() as td:
            model, _ = _load_isolated_model(self.database, Path(td))
            deficits = calculate_population_deficits(model)
        print("\n=== POPULATION DEFICITS BY REALM ===")
        print(f"{'Realm':<12} {'Canon':>6} {'GenPerm':>8} {'PermTgt':>8} {'PermDef':>8} {'GenVis':>7} {'VisTgt':>7} {'VisDef':>7} {'Limit/d':>8}")
        print("-" * 82)
        for r in deficits["realms"]:
            print(
                f"{r['realmName']:<12} {r['canonicalCount']:>6} {r['generatedPermanent']:>8} "
                f"{r['targetPermanent']:>8} {r['permanentDeficit']:>8} {r['generatedVisitors']:>7} "
                f"{r['targetVisitors']:>7} {r['visitorDeficit']:>7} {r['maxGenerationPerDay']:>8}"
            )
        print("-" * 82)
        print(
            f"{'TOTAL':<12} {'':>6} {deficits['totalPermanentCurrent']:>8} "
            f"{deficits['totalPermanentTarget']:>8} {deficits['totalPermanentDeficit']:>8} "
            f"{deficits['totalVisitorCurrent']:>7} {deficits['totalVisitorTarget']:>7} {deficits['totalVisitorDeficit']:>7}"
        )
        return deficits

    def preview_custom(
        self,
        *,
        count: int = 5,
        realm: str | None = None,
        sector: str = "mixed",
        occupation: str | None = None,
        residency_type: str = "permanent",
        naming_style: str = "mixed",
        simulation_depth: str = "Standard",
        seed: int | None = 42,
        authorized_seeding: bool = False,
    ) -> dict[str, Any]:
        with TemporaryDirectory() as td:
            model, _ = _load_isolated_model(self.database, Path(td), seed=seed or 42)
            req = PopulationBatchRequest(
                count=count,
                realm=realm,
                residencyType=residency_type,  # type: ignore[arg-type]
                namingStyle=naming_style,  # type: ignore[arg-type]
                sector=sector,
                occupation=occupation,
                simulationDepth=simulation_depth,  # type: ignore[arg-type]
                seed=seed,
                authorizedSeeding=authorized_seeding,
            )
            preview = DynamicPopulationManager.preview_batch(model, req)
        self.pending_batches.append(preview)
        _print_preview_table(preview)
        return preview

    def preview_fill_deficits(self, residency_type: str = "permanent", seed: int | None = 42) -> dict[str, Any]:
        with TemporaryDirectory() as td:
            model, _ = _load_isolated_model(self.database, Path(td), seed=seed or 42)
            preview = DynamicPopulationManager.preview_deficit_fill(
                model,
                residency_type=residency_type,  # type: ignore[arg-type]
                seed=seed,
            )
        if preview["records"]:
            self.pending_batches.append(preview)
        _print_preview_table(preview)
        return preview

    def review_pending(self) -> None:
        if not self.pending_batches:
            print("\nNo pending batches queued.")
            return
        print(f"\n=== PENDING BATCHES ({len(self.pending_batches)}) ===")
        for idx, b in enumerate(self.pending_batches, start=1):
            print(
                f"  [{idx}] {b['batchId']} — {b['previewCount']} citizens | "
                f"Realms: {b.get('realmDistribution', {})}"
            )

    def commit_pending(self, batch_index: int, *, approved: bool = False) -> dict[str, Any]:
        if not (0 <= batch_index < len(self.pending_batches)):
            raise IndexError("Invalid pending batch selection.")
        if not approved:
            raise PermissionError("Explicit approval is required before committing a batch.")
        batch = self.pending_batches[batch_index]
        backup_path = create_timestamped_backup(self.database)
        print(f"Created verified backup: {backup_path}")
        model = PopulationModel(seed=batch.get("seed") or 42, database=self.database, persist=False)
        result = DynamicPopulationManager.commit_batch(
            model,
            batch["records"],
            batch_id=batch["batchId"],
            trigger_kind="initial_seeding" if batch["previewCount"] > 10 else "manual",
            seed=batch.get("seed"),
            persist_to_db=True,
        )
        self.pending_batches.pop(batch_index)
        print(f"Committed {result['committedCount']} citizens (Batch {result['batchId']}) to {self.database}.")
        return result

    def run_interactive(self) -> None:
        print("=" * 70)
        print("MIRAVERSEOSx POPULATION MANAGER")
        print(f"Authoritative Database: {self.database}")
        print("=" * 70)
        while True:
            print(
                "\nMenu:\n"
                "  1. View population statistics\n"
                "  2. View occupational distribution\n"
                "  3. Identify population deficits by realm\n"
                "  4. Preview generated citizens\n"
                "  5. Generate citizens by realm\n"
                "  6. Generate citizens by occupation\n"
                "  7. Fill permanent population deficits (preview)\n"
                "  8. Fill visitor population deficits (preview)\n"
                "  9. Review pending generation batches\n"
                " 10. Commit approved citizens (requires explicit YES + backup)\n"
                " 11. Validate database integrity\n"
                " 12. Export the citizen roster\n"
                " 13. Exit"
            )
            choice = input("\nSelect option (1-13): ").strip()
            try:
                if choice == "1":
                    self.show_statistics()
                elif choice == "2":
                    self.show_occupations()
                elif choice == "3":
                    self.show_deficits()
                elif choice == "4":
                    cnt = int(input("Count (default 5): ").strip() or "5")
                    seed_raw = input("Seed (optional, default 42): ").strip()
                    self.preview_custom(count=cnt, seed=int(seed_raw) if seed_raw else 42)
                elif choice == "5":
                    print("Realms:", ", ".join(r["name"] for r in REALM_METADATA))
                    realm = input("Realm name: ").strip()
                    cnt = int(input("Count (default 5): ").strip() or "5")
                    self.preview_custom(count=cnt, realm=realm)
                elif choice == "6":
                    print("Sample occupations:", ", ".join(sorted(k.title() for k in list(ALL_OCCUPATIONS.keys())[:18])))
                    occ = input("Occupation title: ").strip()
                    cnt = int(input("Count (default 3): ").strip() or "3")
                    self.preview_custom(count=cnt, occupation=occ)
                elif choice == "7":
                    seed_raw = input("Seed (default 42): ").strip()
                    self.preview_fill_deficits("permanent", seed=int(seed_raw) if seed_raw else 42)
                elif choice == "8":
                    seed_raw = input("Seed (default 42): ").strip()
                    self.preview_fill_deficits("visitor", seed=int(seed_raw) if seed_raw else 42)
                elif choice == "9":
                    self.review_pending()
                elif choice == "10":
                    self.review_pending()
                    if not self.pending_batches:
                        continue
                    idx = int(input("Batch number to commit: ").strip()) - 1
                    confirm = input(f"Type YES to back up {self.database.name} and commit batch #{idx + 1}: ").strip()
                    if confirm == "YES":
                        self.commit_pending(idx, approved=True)
                    else:
                        print("Commit cancelled.")
                elif choice == "11":
                    report = validate_database_integrity(self.database)
                    print("\n=== DATABASE INTEGRITY ===")
                    print(json.dumps(report, indent=2))
                elif choice == "12":
                    out = input("Export path (default output/citizen_roster.json): ").strip() or "output/citizen_roster.json"
                    res = export_citizen_roster(self.database, REPO_ROOT / out)
                    print("Export complete:", res)
                elif choice == "13":
                    print("Exiting MiraverseOSx Population Manager.")
                    break
                else:
                    print("Please choose an option from 1 to 13.")
            except Exception as exc:
                print(f"Error: {exc}")


def main() -> None:
    cli = PopulationManagerCLI(DEFAULT_DATABASE)
    cli.run_interactive()


if __name__ == "__main__":
    main()
