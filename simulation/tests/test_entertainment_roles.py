from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import entertainment


class _Citizen:
    def __init__(self, role: str, hobbies: list[str], music_interest: float = 0.5):
        self.primary_occupation = role
        self.role = role
        self.hobbies = hobbies
        self.preferences = hobbies
        self.music_interest = music_interest


class EntertainmentRoleTests(unittest.TestCase):
    def test_eight_career_families(self) -> None:
        self.assertEqual(len(entertainment.ENTERTAINMENT_CAREER_FAMILIES), 8)
        for family, roles in entertainment.ENTERTAINMENT_CAREER_FAMILIES.items():
            self.assertGreaterEqual(len(roles), 3, family)
            for role_id, kind in roles:
                self.assertIn(kind, ("artist", "staff"))

    def test_journalist_is_a_staff_role(self) -> None:
        citizen = _Citizen("Entertainment Journalist", ["journalism", "criticism"])
        family, role_id, kind = entertainment._entertainment_role_for(citizen, random.Random(1))
        self.assertEqual(family, "communications")
        self.assertEqual(kind, "staff")
        self.assertIn(role_id, ("publicist", "journalist", "radio_host"))

    def test_music_candidates_can_be_artists_or_staff(self) -> None:
        citizen = _Citizen("Recording Artist", ["singing", "songwriting"], music_interest=0.8)
        kinds = {
            entertainment._entertainment_role_for(citizen, random.Random(seed))[2]
            for seed in range(60)
        }
        self.assertTrue(kinds.issubset({"artist", "staff"}))
        self.assertIn("artist", kinds)
        self.assertIn("staff", kinds)

    def test_production_candidates_are_staff(self) -> None:
        citizen = _Citizen("Stage Manager", ["stagecraft", "lighting"])
        family, role_id, kind = entertainment._entertainment_role_for(citizen, random.Random(3))
        self.assertEqual(family, "production")
        self.assertEqual(kind, "staff")


if __name__ == "__main__":
    unittest.main()