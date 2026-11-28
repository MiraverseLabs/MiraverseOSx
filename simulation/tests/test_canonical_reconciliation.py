from __future__ import annotations

from contextlib import closing
from pathlib import Path
import sqlite3
import sys
import unittest

SIM_DIR = Path(__file__).resolve().parents[1]
if str(SIM_DIR) not in sys.path:
    sys.path.insert(0, str(SIM_DIR))

from paths import SOURCE_DATABASE
import entertainment
from population import PopulationModel, load_characters
from profiles_normalizer import normalize_character_profile
import world_services


class CanonicalReconciliationSimulationTests(unittest.TestCase):
    def test_load_characters_uses_61_existing_persons_and_excludes_retired_and_companion(self):
        chars = load_characters()
        self.assertEqual(len(chars), 61)
        by_id = {c["CharacterId"]: c for c in chars}
        # All 7 newly registered canonical characters are present with expected metadata
        expected_new = {
            "char-amara-okafor": ("Amara", "Okafor", "Intelligence Analyst", "Orynvell", "MAID-OR-00481975"),
            "char-isabelle-laurent": ("Isabelle", "Laurent", "Archival Research Specialist", "Lumia", "MAID-LU-00481976"),
            "char-darius-mensah": ("Darius", "Mensah", "Senior Systems Engineer", "Kaji", "MAID-KA-00481977"),
            "char-mei-lin-zhao": ("Mei Lin", "Zhao", "Systems Integration Engineer", "Brisland", "MAID-BR-00481978"),
            "char-samira-el-amin": ("Samira", "El-Amin", "Senior Diplomatic Affairs Officer", "Marlowe", "MAID-MA-00481979"),
            "char-mateo-rivera": ("Mateo", "Rivera", "Community Services Coordinator", "Ve’Raylia", "MAID-VR-00481980"),
            "char-nyla-baptiste": ("Nyla", "Baptiste", "Recording Artist and Songwriter", "Marlowe", "MAID-MA-00481981"),
        }
        for cid, (fn, ln, occ, realm, maid) in expected_new.items():
            self.assertIn(cid, by_id)
            row = by_id[cid]
            self.assertEqual((row["FirstName"], row["LastName"], row["Occupation"], row["HomeRealm"], row["Maid"]), (fn, ln, occ, realm, maid))
        # Formerly document-only canonical people are now active existing persons with MAIDs
        for cid in ("char-vael", "char-franz-hopper", "char-echo-neket", "char-idris", "char-lyse", "char-oryn", "char-rhen", "char-solis-agni"):
            self.assertIn(cid, by_id)
            self.assertEqual(by_id[cid]["Status"], "existing")
            self.assertTrue(by_id[cid]["Maid"])
        # Companion record must remain distinct from active living persons
        self.assertNotIn("char-mai", by_id)
        # Retired / deleted characters must never appear
        for retired_id in ("char-elara-vale", "char-mara-thorne", "char-vaelen", "char-kaelen", "char-neryx", "char-lyric-enya"):
            self.assertNotIn(retired_id, by_id)

    def test_explicit_db_columns_take_precedence_and_home_realm_is_not_birth_realm(self):
        chars = {c["CharacterId"]: c for c in load_characters()}
        elena = chars["char-elena-rostova"]
        norm = normalize_character_profile(elena)
        self.assertEqual(norm["first_name"], elena["FirstName"])
        self.assertEqual(norm["last_name"], elena["LastName"])
        self.assertEqual(norm["primary_occupation"], elena["Occupation"])
        self.assertEqual(norm["home_realm"], "Fross")
        # MAID issued outside HomeRealm must be preserved
        self.assertIn("MAID-OR-00481931", norm["maids"])
        # HomeRealm must NOT overwrite or be interpreted as BirthRealm / OriginRealm
        self.assertNotEqual(norm["origin_realm"], "Fross")

        # Companion distinction is preserved, while legacy document-only status normalizes to existing & eligible
        companion_norm = normalize_character_profile(
            {"CharacterId": "char-mai", "Name": "Mai", "Kind": "companion", "Status": "existing", "profiles": []}
        )
        self.assertEqual(companion_norm["character_classification"], "Companion")
        self.assertFalse(companion_norm["eligible_for_living_sim"])

        former_doc_norm = normalize_character_profile(
            {
                "CharacterId": "char-vael",
                "Name": "Headmistress Serena Vael",
                "Kind": "person",
                "Status": "document-only",
                "FirstName": "Serena",
                "LastName": "Vael",
                "Title": "Headmistress",
                "Occupation": "Headmistress",
                "HomeRealm": "Lumia",
                "profiles": [],
            }
        )
        self.assertEqual(former_doc_norm["record_status"], "existing")
        self.assertTrue(former_doc_norm["eligible_for_living_sim"])
        self.assertEqual(former_doc_norm["home_realm"], "Lumia")
        self.assertEqual(former_doc_norm["origin_realm"], "")

    def test_historical_runs_remain_accessible_without_reinstating_deleted_citizens(self):
        with closing(sqlite3.connect(f"file:{SOURCE_DATABASE.resolve().as_posix()}?mode=ro", uri=True)) as conn:
            run_row = conn.execute(
                "SELECT RunId FROM LivingWorldRuns ORDER BY UpdatedAt DESC LIMIT 1"
            ).fetchone()
            tx_count = conn.execute("SELECT COUNT(*) FROM LivingWorldTransactions").fetchone()[0]
            self.assertGreaterEqual(tx_count, 241)
            self.assertIsNotNone(run_row)
            latest_run_id = run_row[0]

        model = PopulationModel(database=SOURCE_DATABASE, run_id=latest_run_id, persist=False)
        agent_ids = {a.character_id for a in model.agents}
        canonical_ids = {c["CharacterId"] for c in load_characters()}
        self.assertEqual(len(canonical_ids), 61)
        self.assertTrue(canonical_ids.issubset(agent_ids))
        self.assertNotIn("char-elara-vale", agent_ids)
        self.assertNotIn("char-mara-thorne", agent_ids)
        self.assertNotIn("char-vaelen", agent_ids)

    def test_entertainment_orgs_and_canonical_careers_load_from_sqlite(self):
        entertainment._ORGS_CACHE = None
        orgs = entertainment.load_entertainment_organizations()
        self.assertEqual(len(orgs), 25)
        self.assertTrue(any(o["id"] == "ORG_SONGBIRD" for o in orgs))

        careers = world_services.load_canonical_careers()
        self.assertEqual(len(careers), 10)
        ids = {c["canonicalId"] for c in careers}
        self.assertIn("career-enforcer", ids)
        self.assertIn("career-press", ids)


if __name__ == "__main__":
    unittest.main()
