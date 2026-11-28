from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import tempfile
import unittest
from living_world_api import create_server
from population import PopulationModel
from realtime_world import clock_record, sync_model
from test_living_world import _citizens


class RealtimeWorldTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = create_server(0, Path(self.temp.name) / 'world.db', _citizens())
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(self.server.server_close)

    def test_clock_survives_restart_and_catches_up_exact_minutes_once(self):
        start = 1_800_000_000_000
        first = clock_record(self.server, 18 * 60, now_ms=start)
        later = clock_record(self.server, 99999, now_ms=start + 61 * 60000)
        self.assertEqual(later['runId'], first['runId'])
        self.assertEqual(later['elapsedMinutes'], 18 * 60 + 61)
        again = clock_record(self.server, now_ms=start + 61 * 60000)
        self.assertEqual(again['revision'], later['revision'])
        self.server.server_close()
        self.server = create_server(0, self.server.database, _citizens())
        self.addCleanup(self.server.server_close)
        resumed = clock_record(self.server, now_ms=start + 90 * 60000)
        self.assertEqual(resumed['anchorUnixMs'], first['anchorUnixMs'])
        self.assertEqual(resumed['elapsedMinutes'], 18 * 60 + 90)

    def test_experiments_remain_independent_and_live_world_cannot_fast_forward(self):
        experiment = PopulationModel(database=self.server.database, characters=_citizens())
        live = clock_record(self.server, 1080, now_ms=1_800_000_000_000)
        model = PopulationModel(database=self.server.database, run_id=live['runId'], characters=_citizens())
        for action in [model.step, lambda: model.set_playing(True), lambda: model.set_step_minutes(1)]:
            with self.assertRaises(ValueError): action()
        sync_model(model, live['anchorUnixMs'] + 2 * 60000)
        self.assertEqual(model.world_clock.elapsed_minutes, 1082)
        experiment.step()
        self.assertEqual(experiment.world_clock.elapsed_minutes, 30)

    def test_backward_wall_clock_does_not_rewind_or_duplicate_simulation(self):
        first = clock_record(self.server, 1080, now_ms=1_800_000_000_000)
        later = clock_record(self.server, now_ms=first['anchorUnixMs'] - 60000)
        self.assertEqual(later['elapsedMinutes'], first['elapsedMinutes'])
        self.assertEqual(later['revision'], first['revision'])
