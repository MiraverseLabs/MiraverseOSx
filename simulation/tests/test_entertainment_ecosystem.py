from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import entertainment
from living_world_api import create_server
from population import PopulationModel


def _ent_citizens() -> list[dict]:
    def make_char(cid: str, name: str, occupation: str, affiliation: str, address: str, age: str, prefs: str) -> dict:
        return {
            "CharacterId": cid,
            "Name": name,
            "Kind": "person",
            "Status": "existing",
            "db_aliases": [],
            "profiles": [
                {
                    "collection": "NPCS",
                    "context": "test",
                    "data": {
                        "role": occupation,
                        "title": occupation,
                        "realm": "Orynvell",
                        "affiliation": affiliation,
                    },
                },
                {
                    "collection": "defaultInputs",
                    "context": "test",
                    "data": {
                        "occupation": occupation,
                        "affiliation": affiliation,
                        "address": address,
                        "age": age,
                        "preferences": prefs,
                    },
                },
            ],
        }

    return [
        make_char(
            "ENT-VIV",
            "Vivienne Rose",
            "Recording Artist",
            "Starstruck Entertainment",
            "18 Promenade Terrace, Glassline District, Aureline, Orynvell",
            "26",
            "singing, songwriting, piano, fashion",
        ),
        make_char(
            "ENT-LEO",
            "Leo Sterling",
            "Screen Actor",
            "Mirrora Studios",
            "22 Promenade Terrace, Glassline District, Aureline, Orynvell",
            "29",
            "acting, theatre, cinema, dance",
        ),
        make_char(
            "ENT-NYL",
            "Nyla Baptiste",
            "Recording Artist and Songwriter",
            "Independent",
            "9 Harbor Walk, Marlowe Coast, Marlowe",
            "24",
            "Alternative R&B, neo-soul, electronic pop, songwriting",
        ),
        make_char(
            "ENT-SOR",
            "Sora Takahashi",
            "Contemporary Dancer",
            "Wonder-Wind Dance Company",
            "4 Marigold Square, Promenade Quarter, Aureline, Orynvell",
            "25",
            "choreography, dance, stagecraft",
        ),
        make_char(
            "ENT-FAN1",
            "Mina Vance",
            "Barista",
            "Harbor Roasters",
            "14 Harbor Walk, Angel Bay, Aureline, Orynvell",
            "22",
            "concerts, streaming music, radio",
        ),
        make_char(
            "ENT-JRN",
            "Caleb Morrow",
            "Entertainment Journalist",
            "Limelight",
            "29 Quay Arcade, Glassline District, Aureline, Orynvell",
            "31",
            "culture, journalism, criticism",
        ),
    ]


class EntertainmentEcosystemTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "entertainment_test.db"
        self.characters = _ent_citizens()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_all_25_section_xix_organizations_are_loaded(self) -> None:
        orgs = entertainment.load_entertainment_organizations()
        self.assertGreaterEqual(len(orgs), 25)
        org_ids = {o["id"] for o in orgs}
        for required_id in (
            "ORG_STARSTRUCK",
            "ORG_SECOND_ACT",
            "ORG_MARLIE_RECORDS",
            "ORG_SONGBIRD",
            "ORG_LIMELIGHT",
            "ORG_POP_STICKER",
            "ORG_OPEN_CALL",
            "ORG_SILVERLEAF_STADIUM",
            "ORG_LOOKING_GLASS",
            "ORG_WORD_OF_MOUTH",
            "ORG_RADIANCE_AWARDS",
        ):
            self.assertIn(required_id, org_ids)

    def test_autonomous_multiday_simulation_drives_releases_concerts_royalties_and_awards(self) -> None:
        model = PopulationModel(
            seed=108,
            database=self.db_path,
            characters=self.characters,
            step_minutes=60,
            persist=True,
        )
        # Advance 31 days (24 steps/day = 744 steps) to cross a full Radiance Awards cycle
        model.advance_steps(744)
        run = {"state": model._export_state(), "calendar": model.calendar_config}
        snap = entertainment.industry_snapshot(run)

        self.assertGreaterEqual(snap["metrics"]["totalArtists"], 3)
        self.assertGreaterEqual(snap["metrics"]["totalTracks"], 1)
        self.assertGreaterEqual(snap["metrics"]["totalStreams"], 1)
        self.assertGreaterEqual(len(snap["awards"]), 1)

        # Verify all 8 fame axes + communityReception are populated and bounded 0..100
        first_artist = run["state"]["artists"][0]
        prof = entertainment.fame_profile(run, first_artist["artistId"])
        for axis in entertainment.FAME_AXES:
            self.assertIn(axis, prof)
            self.assertGreaterEqual(prof[axis], 0.0)
            self.assertLessEqual(prof[axis], 100.0)
        self.assertIn("communityReception", prof)
        self.assertGreaterEqual(len(prof["communityReception"]), 4)

        # Verify venue double-booking prevention on identical venue + day + slot
        concert = entertainment.schedule_concert(
            run,
            {
                "concertId": "CONCERT-SOLO-TEST",
                "artistId": first_artist["artistId"],
                "venueOrgId": "ORG_LOOKING_GLASS",
                "venue": "The Looking Glass",
                "scheduledDay": 95,
                "slot": "evening",
                "ticketPrice": 35,
                "capacity": 180,
            },
        )
        self.assertEqual(concert["status"], "scheduled")
        with self.assertRaises(ValueError):
            entertainment.schedule_concert(
                run,
                {
                    "artistId": first_artist["artistId"],
                    "venueOrgId": "ORG_LOOKING_GLASS",
                    "venue": "The Looking Glass",
                    "scheduledDay": 95,
                    "slot": "evening",
                    "ticketPrice": 40,
                    "capacity": 180,
                },
            )

        # Verify contract switching replaces previous management agency cleanly
        c1 = entertainment.manage_contract(
            run,
            {
                "action": "sign",
                "artistId": first_artist["artistId"],
                "orgId": "ORG_STARSTRUCK",
                "contractType": "management",
                "switchAgency": True,
            },
        )
        self.assertEqual(c1["status"], "active")
        c2 = entertainment.manage_contract(
            run,
            {
                "action": "sign",
                "artistId": first_artist["artistId"],
                "orgId": "ORG_SECOND_ACT",
                "contractType": "management",
                "switchAgency": True,
            },
        )
        self.assertEqual(c2["status"], "active")
        active_agencies = [
            c
            for c in run["state"]["entertainment_contracts"]
            if c["artistId"] == first_artist["artistId"]
            and c["contractType"] == "management"
            and c["status"] == "active"
        ]
        self.assertEqual(len(active_agencies), 1)
        self.assertEqual(active_agencies[0]["orgId"], "ORG_SECOND_ACT")

    def test_living_world_api_exposes_fame_and_entertainment_lifecycle_routes(self) -> None:
        server = create_server(0, self.db_path, self.characters)
        port = server.server_port
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            def call(method: str, path: str, payload: dict | None = None) -> dict:
                data = json.dumps(payload).encode("utf-8") if payload is not None else None
                headers = {"Content-Type": "application/json; charset=utf-8"} if payload is not None else {}
                req = Request(f"http://127.0.0.1:{port}{path}", data=data, headers=headers, method=method)
                with urlopen(req, timeout=10) as resp:
                    return json.loads(resp.read().decode("utf-8"))

            created = call("POST", "/api/livingworld/runs", {"name": "Ent API Run", "seed": 77})
            run_id = created["runId"]

            artist_res = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/artists",
                {
                    "artistId": "ART-PLAYER-1",
                    "stageName": "Nova Lyric",
                    "disciplines": ["music", "dance"],
                    "genres": ["Synth-Pop", "Harbor Soul"],
                    "origin": "player",
                    "recognition": 24,
                    "artisticCredibility": 42,
                },
            )
            self.assertEqual(artist_res["result"]["artistId"], "ART-PLAYER-1")

            fame_res = call("GET", f"/api/livingworld/fame?runId={run_id}&id=ART-PLAYER-1")
            self.assertEqual(fame_res["stageName"], "Nova Lyric")
            self.assertEqual(fame_res["artisticCredibility"], 42.0)

            track_res = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/music",
                {
                    "trackId": "TRK-NOVA-1",
                    "artistId": "ART-PLAYER-1",
                    "title": "Glassline Midnight",
                    "genre": "Synth-Pop",
                    "durationSeconds": 198,
                    "quality": 84,
                },
            )
            self.assertIn("/sounds/", track_res["result"]["audioUrl"])

            audition_res = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/auditions",
                {
                    "action": "create",
                    "title": "Velvet Row Dance Showcase Lead",
                    "orgId": "ORG_WONDER_WIND",
                    "discipline": "dance",
                    "stipendCredits": 950,
                },
            )
            aud_id = audition_res["result"]["auditionId"]

            apply_res = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/auditions",
                {
                    "action": "apply",
                    "auditionId": aud_id,
                    "artistId": "ART-PLAYER-1",
                    "skillScore": 85,
                    "evaluateImmediately": True,
                },
            )
            self.assertTrue(apply_res["result"]["booked"])

            ticket_concert = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/concerts",
                {
                    "concertId": "CON-NOVA-1",
                    "artistId": "ART-PLAYER-1",
                    "venueOrgId": "ORG_LOOKING_GLASS",
                    "venue": "The Looking Glass",
                    "scheduledDay": 14,
                    "ticketPrice": 30,
                    "capacity": 180,
                },
            )
            self.assertEqual(ticket_concert["result"]["concertId"], "CON-NOVA-1")

            ticket_res = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/tickets",
                {
                    "concertId": "CON-NOVA-1",
                    "buyerCharacterId": "PLAYER",
                    "buyerName": "Player Citizen",
                    "quantity": 2,
                    "requestId": "REQ-TKT-001",
                },
            )
            # Duplicate requestId returns the exact same receipt without double counting
            ticket_dup = call(
                "POST",
                f"/api/livingworld/runs/{run_id}/tickets",
                {
                    "concertId": "CON-NOVA-1",
                    "buyerCharacterId": "PLAYER",
                    "buyerName": "Player Citizen",
                    "quantity": 2,
                    "requestId": "REQ-TKT-001",
                },
            )
            self.assertEqual(ticket_res["result"]["ticketId"], ticket_dup["result"]["ticketId"])
            self.assertTrue(ticket_dup["result"].get("alreadyApplied"))

            ent_snap = call("GET", f"/api/livingworld/runs/{run_id}/entertainment")
            self.assertGreaterEqual(ent_snap["metrics"]["totalArtists"], 1)
            concert_row = next(c for c in ent_snap["concerts"] if c["concertId"] == "CON-NOVA-1")
            self.assertEqual(concert_row["ticketsSold"], 2)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
