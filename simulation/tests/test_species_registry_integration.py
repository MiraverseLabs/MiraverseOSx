"""Comprehensive verification tests for Meridion Species Registry integration."""
from __future__ import annotations

import json
import sqlite3
import sys
import unittest
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SIM_DIR = REPO_ROOT / "simulation"
if str(SIM_DIR) not in sys.path:
    sys.path.insert(0, str(SIM_DIR))

import species_genetics

DB_PATH = REPO_ROOT / "miraverse.db"


class SpeciesRegistryIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        cls.conn.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls) -> None:
        cls.conn.close()

    def test_all_386_records_imported_with_exact_ids(self) -> None:
        total = self.conn.execute("SELECT COUNT(*) FROM Species").fetchone()[0]
        self.assertEqual(total, 386)
        ids = {r[0] for r in self.conn.execute("SELECT id FROM Species").fetchall()}
        self.assertEqual(len(ids), 386)
        for i in range(1, 387):
            self.assertIn(f"MR-{i:03d}", ids)

    def test_foreign_key_integrity_and_existing_data_preserved(self) -> None:
        fk_errors = self.conn.execute("PRAGMA foreign_key_check").fetchall()
        self.assertEqual(len(fk_errors), 0, f"Foreign key errors: {fk_errors}")
        self.assertGreaterEqual(self.conn.execute("SELECT COUNT(*) FROM Characters").fetchone()[0], 62)
        self.assertGreaterEqual(self.conn.execute("SELECT COUNT(*) FROM MaidRegistry").fetchone()[0], 242)
        self.assertGreaterEqual(self.conn.execute("SELECT COUNT(*) FROM GeneratedCitizens").fetchone()[0], 178)

    def test_taxonomic_separation_not_all_biological_species(self) -> None:
        bio_count = self.conn.execute("SELECT COUNT(*) FROM Species WHERE is_biological_species = 1").fetchone()[0]
        self.assertLess(bio_count, 386)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM AngelicChoirs").fetchone()[0], 9)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM WitchTraditions").fetchone()[0], 31)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM PractitionerTypes").fetchone()[0], 19)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM SupernaturalStatuses").fetchone()[0], 4)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM Species WHERE classification_type = 'elemental_human'").fetchone()[0], 8)

    def test_canonical_worldbuilding_rules(self) -> None:
        # Elemental human lifespan
        frossian = self.conn.execute("SELECT lifespan, canon_status FROM Species WHERE id = 'MR-001'").fetchone()
        self.assertEqual(frossian["lifespan"], "Up to 200 years")
        self.assertEqual(frossian["canon_status"], "Established")

        # Witchcraft exclusive to Witchkind
        non_excl = self.conn.execute("SELECT COUNT(*) FROM WitchTraditions WHERE witchkind_exclusive != 1").fetchone()[0]
        self.assertEqual(non_excl, 0)

        # Warlock is a male practitioner, not biological species
        warlock = self.conn.execute("SELECT gender_restriction, is_biological_species FROM PractitionerTypes WHERE name = 'Warlock'").fetchone()
        self.assertEqual(warlock["gender_restriction"], "Male")
        self.assertEqual(warlock["is_biological_species"], 0)

        # Angelic choirs separate from ancestry
        choir_sep = self.conn.execute("SELECT COUNT(*) FROM AngelicChoirs WHERE separate_from_ancestry != 1").fetchone()[0]
        self.assertEqual(choir_sep, 0)

        # Supernatural statuses never auto-assigned
        auto_ok = self.conn.execute("SELECT COUNT(*) FROM SupernaturalStatuses WHERE auto_assign_allowed != 0").fetchone()[0]
        self.assertEqual(auto_ok, 0)

        # Nephele 5% pure Nether cap recorded (Nephelian = MR-153)
        neph = self.conn.execute("SELECT pure_nether_cap_pct FROM SpeciesInheritance WHERE species_id = 'MR-153'").fetchone()
        self.assertEqual(neph["pure_nether_cap_pct"], 5.0)

        # Provisional lore preserved as provisional
        prov = self.conn.execute("SELECT COUNT(*) FROM Species WHERE is_provisional = 1").fetchone()[0]
        est = self.conn.execute("SELECT COUNT(*) FROM Species WHERE is_provisional = 0").fetchone()[0]
        self.assertEqual(est, 17)
        self.assertEqual(prov, 369)

        # Pegasi transport-capable; dragons NOT domesticated
        pegasus = self.conn.execute(
            "SELECT w.transport_capable, s.affinity FROM WildlifePopulations w JOIN Species s ON s.id = w.species_id WHERE s.name = 'Pegasus'"
        ).fetchone()
        self.assertEqual(pegasus["transport_capable"], 1)
        dom_dragons = self.conn.execute(
            "SELECT COUNT(*) FROM WildlifePopulations w JOIN Species s ON s.id = w.species_id WHERE s.family_name = 'Draconic' AND w.domestication_status LIKE 'Domesticated%'"
        ).fetchone()[0]
        self.assertEqual(dom_dragons, 0)

    def test_offline_assets_extracted_and_no_base64_in_db(self) -> None:
        assets = self.conn.execute("SELECT asset_id, relative_path, file_size_bytes FROM SpeciesAssets").fetchall()
        self.assertGreaterEqual(len(assets), 35)
        for row in assets:
            self.assertFalse(row["relative_path"].startswith("data:"))
            self.assertGreater(row["file_size_bytes"], 1000)
            pub_file = REPO_ROOT / "frontend" / "public" / row["relative_path"].lstrip("/")
            self.assertTrue(pub_file.exists(), f"Missing extracted asset: {pub_file}")

    def test_genetics_generator_and_wildlife_summary(self) -> None:
        rng = np.random.default_rng(12345)
        # Check Northwake Frossian constraints & never auto-assign immortality/sainthood
        northwake_seen = 0
        for _ in range(40):
            prof = species_genetics.generate_citizen_genetics(self.conn, home_realm="Fross", rng=rng, age=28)
            self.assertEqual(prof["genetics"]["supernaturalStatuses"], [])
            if prof["regional_lineage"] == "Northwake":
                northwake_seen += 1
                self.assertNotIn("Brown", prof["genetics"]["appearance"]["eyeColor"])
                self.assertNotIn("Black", prof["genetics"]["appearance"]["hairColor"])
        self.assertGreater(northwake_seen, 0)

        # Check Nephele 5% pure Nether cap over 400 samples
        pure_count = sum(
            1
            for _ in range(400)
            if species_genetics.generate_citizen_genetics(self.conn, home_realm="Nephele", rng=rng)["genetics"]["pureNetherManifested"]
        )
        self.assertLess(pure_count / 400.0, 0.12)

        # Check aggregated wildlife summary
        summary = species_genetics.list_wildlife_summary(DB_PATH)
        self.assertEqual(summary["count"], 172)
        self.assertGreater(len(summary["transportFauna"]), 0)


if __name__ == "__main__":
    unittest.main()
