from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import entertainment


class _Citizen:
    def __init__(self, preferences: list[str], music_interest: float = 0.5, activity: str = "Relaxing", sociability: float = 0.5):
        self.preferences = preferences
        self.music_interest = music_interest
        self.activity = activity
        self.sociability = sociability


class EntertainmentImprovementTests(unittest.TestCase):
    def test_artist_defaults_include_negotiated_split(self) -> None:
        artist = entertainment._ensure_artist_defaults({})
        self.assertEqual(artist["royaltySplitArtist"], 0.80)

    def test_slot_hour_reflects_each_events_scheduled_time(self) -> None:
        self.assertEqual(entertainment._slot_hour("afternoon"), 14)
        self.assertEqual(entertainment._slot_hour("evening"), 19)
        self.assertEqual(entertainment._slot_hour("late"), 22)
        self.assertEqual(entertainment._slot_hour(""), 19)

    def test_listener_affinity_prefers_genre_and_activity(self) -> None:
        track = {"genre": "Glassline Synth"}
        aligned = _Citizen(["glassline synth", "electronic"], music_interest=0.9, activity="Entertainment")
        unaligned = _Citizen(["jazz"], music_interest=0.1, activity="Commuting")
        self.assertGreater(
            entertainment._listener_affinity(aligned, track),
            entertainment._listener_affinity(unaligned, track),
        )

    def test_choose_track_uses_preference_popularity_and_discovery(self) -> None:
        listener = _Citizen(["glassline synth"])
        tracks = [
            {"trackId": "a", "genre": "Jazz", "quality": 90, "streams": 0, "radioSpins": 0},
            {"trackId": "b", "genre": "Glassline Synth", "quality": 60, "streams": 5, "radioSpins": 2},
        ]
        chosen = entertainment._choose_track(listener, tracks, random.Random(7))
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen["trackId"], "b")

    def test_venue_choices_respect_recognition_budget_and_availability(self) -> None:
        low = {"recognition": 0.0, "totalRoyaltiesEarned": 0.0, "totalBoxOfficeEarned": 0.0}
        choices = entertainment._venue_choices(low, [], 5, random.Random(1))
        self.assertEqual([venue for _, venue, _ in choices], ["ORG_LOOKING_GLASS"])

        high = {"recognition": 100.0, "totalRoyaltiesEarned": 0.0, "totalBoxOfficeEarned": 0.0}
        choices = entertainment._venue_choices(high, [], 5, random.Random(1))
        venues = {venue for _, venue, _ in choices}
        self.assertIn("ORG_LOOKING_GLASS", venues)
        self.assertNotIn("ORG_SILVERLEAF_STADIUM", venues)  # rental 4500 exceeds the 400 budget
        self.assertNotIn("ORG_MARIGOLD_THEATRE", venues)  # rental 480 exceeds the 400 budget

        booked = [
            {
                "status": "scheduled",
                "venueOrgId": "ORG_LOOKING_GLASS",
                "scheduledDay": 5,
                "slot": "evening",
            }
        ]
        choices = entertainment._venue_choices(low, booked, 5, random.Random(1))
        self.assertEqual(choices, [])


if __name__ == "__main__":
    unittest.main()