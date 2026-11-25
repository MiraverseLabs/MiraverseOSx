"""Staged edits must work in a fresh checkout without the retired Lab folder."""
import sys
from pathlib import Path
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from overrides_store import _read_store, _write_or_prune_store


class LocalStateTests(unittest.TestCase):
    def test_staging_creates_its_directory_and_prunes_only_the_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "state" / "staged_population_overrides.json"
            records = {"TEST-ADA": {"character_id": "TEST-ADA", "review_status": "draft",
                                    "reviewer_notes": "", "data": {"name": "Ada"},
                                    "updated_at": ""}}
            _write_or_prune_store(records, target)
            self.assertEqual(_read_store(target), records)
            _write_or_prune_store({}, target)
            self.assertFalse(target.exists())
            self.assertTrue(target.parent.is_dir())


if __name__ == "__main__":
    unittest.main()
