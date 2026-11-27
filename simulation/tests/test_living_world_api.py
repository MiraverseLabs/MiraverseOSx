from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import copy
import json
import tempfile
import sqlite3
from contextlib import closing
from unittest.mock import patch
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from living_world import LivingWorldStore, RunConflictError
from living_world_api import create_server
from population import PopulationModel
from test_living_world import _citizens


class LivingWorldApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / 'runs.db'
        # Independent canonical fixture: endpoint tests must not require a live DB.
        source = Path(self.temp.name) / 'source.db'
        with closing(sqlite3.connect(source)) as conn:
            conn.execute("""CREATE TABLE EntertainmentOrganizations (
                OrganizationId TEXT, Name TEXT, ShortName TEXT, Sector TEXT, Kind TEXT,
                Domain TEXT, Realm TEXT, Seat TEXT, Tagline TEXT, VenueCapacity INTEGER)""")
            conn.execute("INSERT INTO EntertainmentOrganizations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('ORG_TEST', 'Test Studio', 'Test', 'media', 'studio', 'test.aure', 'Orynvell', 'Aureline', 'Test', None))
            conn.commit()
        self.source_patch = patch('entertainment.SOURCE_DATABASE', source)
        self.source_patch.start()
        self.addCleanup(self.source_patch.stop)
        self.server = create_server(0, self.database, _citizens())
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'
        self.run_id = self.request('/api/livingworld/runs', {'seed':19})[1]['runId']

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = Request(self.base+path, data=data, headers={'Content-Type':'application/json; charset=utf-8', **(headers or {})})
        try:
            with urlopen(req, timeout=15) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            with error:
                return error.code, json.load(error)

    def get(self, name):
        status, result = self.request(f'/api/livingworld/{name}?runId={self.run_id}')
        self.assertEqual(status,200,result)
        return result

    def post(self, name, body):
        status, result = self.request('/api/livingworld/'+name, {'runId':self.run_id, **body})
        self.assertEqual(status,200,result)
        return result['result']

    def test_prefixed_and_short_routes_advance_actual_citizens_without_read_writes(self):
        status, before = self.request('/api/livingworld/runs/'+self.run_id)
        self.assertEqual(status,200)
        _, same = self.request('/runs/'+self.run_id)
        self.assertEqual(same['run']['revision'],before['run']['revision'])
        status, result = self.request('/api/livingworld/runs/'+self.run_id+'/advance',{'steps':2})
        self.assertEqual(status,200,result)
        self.assertEqual(result['clock']['tick_count'],2)
        self.assertEqual(result['clock']['elapsed_minutes'],60)
        _, after = self.request('/runs/'+self.run_id)
        self.assertNotEqual(after['run']['state']['citizens'],before['run']['state']['citizens'])
        self.assertEqual(after['run']['revision'],before['run']['revision']+1,'batch advance is one atomic save')
        schedules=self.get('schedules')['schedules']
        self.assertEqual(len(schedules),len(_citizens()))
        self.assertTrue(all(s['minuteOfDay']==60 for s in schedules))

    def test_services_share_citizen_balances_ledger_and_graph_and_survive_simulator_saves(self):
        account=self.get('finances')['accounts']['TEST-ADA']
        payment={'characterId':'TEST-ADA','kind':'commission','amount':25,'requestId':'receipt-1','description':'Public commission'}
        self.post('finances',payment)
        self.post('finances',payment)
        finances=self.get('finances')
        self.assertEqual(finances['accounts']['TEST-ADA'],account+25)
        self.assertEqual(len(finances['transactions']),1)
        status,_=self.request('/finances',{'runId':self.run_id,**payment,'amount':26})
        self.assertEqual(status,400)
        self.post('careers',{'characterId':'TEST-ADA','title':'Archivist','employer':'Royal Archives','salary':300,'schedule':'flexible'})
        self.post('relationships',{'fromCharacterId':'TEST-ADA','toCharacterId':'TEST-BEA','kind':'friend','trust':75,'affection':40})
        artist=self.post('artists',{'characterId':'TEST-ADA','stageName':'Archive Echo','genres':['ambient']})
        track=self.post('music',{'artistId':artist['artistId'],'title':'Evening Archive','durationSeconds':180})
        self.post('releases',{'trackId':track['trackId'],'royaltyRate':0.1})
        self.post('concerts',{'artistId':artist['artistId'],'venue':'Glassline','capacity':100,'ticketPrice':5})
        self.post('events',{'title':'Archive recital'})
        loaded=PopulationModel(database=self.database,run_id=self.run_id,characters=_citizens())
        ada=next(c for c in loaded.agents if c.character_id=='TEST-ADA')
        self.assertEqual(ada.balance,account+25)
        self.assertEqual(ada.primary_occupation,'Archivist')
        ada.daily_schedule[0]['label']='Custom rest block'
        loaded.save()
        again=PopulationModel(database=self.database,run_id=self.run_id,characters=_citizens())
        self.assertEqual(next(c for c in again.agents if c.character_id=='TEST-ADA').daily_schedule[0]['label'],'Custom rest block')
        for name in ('artists','music','releases','concerts','events'):
            result=self.get(name)
            self.assertEqual(len(next(iter(result.values()))),1,name)
        self.assertTrue(any(e['source']=='run service' and e['trust']==75 for e in self.get('relationships')['relationships']))

    def test_stale_writers_and_bad_commands_cannot_corrupt_latest_snapshot(self):
        stale=PopulationModel(database=self.database,run_id=self.run_id,characters=_citizens())
        before=self.get('finances')['accounts']['TEST-ADA']
        self.post('finances',{'characterId':'TEST-ADA','kind':'income','amount':10})
        clock_before=stale.world_clock.to_state()
        with self.assertRaises(RunConflictError): stale.step()
        self.assertEqual(stale.world_clock.to_state(),clock_before)
        status,_=self.request('/runs/'+self.run_id+'/advance',{'steps':1,'expectedRevision':0})
        self.assertEqual(status,409)
        self.assertEqual(self.get('finances')['accounts']['TEST-ADA'],before+10)
        for command in [
            {'characterId':'NOT-A-CITIZEN','kind':'income','amount':10},
            {'characterId':'TEST-ADA','kind':'income','amount':float('nan')},
            {'characterId':'TEST-ADA','kind':'income','amount':-100000},
        ]:
            self.assertEqual(self.request('/finances',{'runId':self.run_id,**command})[0],400)
        self.assertEqual(self.request('/runs/'+self.run_id+'/advance',{'steps':True})[0],400)
        self.assertEqual(self.request('/health',headers={'Origin':'https://foreign.invalid'})[0],403)

    def test_legacy_api_fields_and_unknown_extensions_are_preserved_once(self):
        run=self.server.store.load_run(self.run_id)
        state=run['state']
        state.update({'accounts':{'TEST-ADA':12,'UNKNOWN-ID':9},'transactions':[{'transactionId':'legacy'}],
                      'custom_extension':{'notes':['keep me']}})
        original=state['citizens']['TEST-ADA']['balance']
        self.server.store.save_run(self.run_id,state)
        model=PopulationModel(database=self.database,run_id=self.run_id,characters=_citizens())
        model.save()
        restored=PopulationModel(database=self.database,run_id=self.run_id,characters=_citizens())
        restored.save()
        saved=self.server.store.load_run(self.run_id)['state']
        self.assertEqual(saved['citizens']['TEST-ADA']['balance'],original+12)
        self.assertEqual(saved['custom_extension'],{'notes':['keep me']})
        self.assertEqual(saved['transactions'],[{'transactionId':'legacy'}])
        self.assertEqual(saved['legacy_service_state']['accounts']['UNKNOWN-ID'],9)
        self.assertNotIn('accounts',saved)

    def test_entertainment_resources_and_projects_are_available(self):
        orgs = self.get('organizations')['organizations']
        self.assertEqual([org['OrganizationId'] for org in orgs], ['ORG_TEST'])
        artist = self.post('artists', {'characterId': 'TEST-ADA', 'stageName': 'API Echo', 'genres': ['ambient']})
        track = self.post('music', {'artistId': artist['artistId'], 'title': 'API Signal', 'durationSeconds': 180})
        self.post('releases', {'trackId': track['trackId'], 'royaltyRate': 0.1})
        charts = self.get('charts')['charts']
        self.assertTrue(any(entry['trackId'] == track['trackId'] for entry in charts))
        project = self.post('projects', {'action': 'create', 'title': 'API Feature', 'kind': 'film', 'studioOrgId': 'ORG_MIRRORA_STUDIOS', 'budget': 5000})
        projects = self.get('projects')['projects']
        self.assertEqual(next(entry for entry in projects if entry['projectId'] == project['productionId'])['budget'], 5000)
        contracts = {
            'rights': ('rights',), 'licensing': ('licenses',),
            'royalties': ('totalsByKind', 'artists', 'entries'), 'media': ('media',),
            'memberships': ('fanCommunities', 'staff'), 'bookings': ('bookings',),
            'tours': ('tours',), 'broadcasting': ('broadcasting',),
            'campaigns': ('campaigns',), 'awards': ('awards',),
        }
        for resource, keys in contracts.items():
            with self.subTest(resource=resource):
                result = self.get(resource)
                for key in keys:
                    self.assertIn(key, result)


    def test_derived_rights_revenue_and_awards_are_run_scoped_read_only_and_persistent(self):
        artist = self.post('artists', {'characterId': 'TEST-ADA', 'stageName': 'Rights Echo'})
        track = self.post('music', {'artistId': artist['artistId'], 'title': 'Licensed Signal',
            'durationSeconds': 180, 'publisherOrgId': 'ORG_KAJI_PUBLISHING'})
        self.post('publicity', {'action': 'stream_track', 'trackId': track['trackId'], 'plays': 10})
        run = self.server.store.load_run(self.run_id)
        run['state']['awards'] = [{'awardId': 'test-award', 'status': 'open'}]
        self.server.store.save_run(self.run_id, run['state'])
        # The same IDs in another run must not leak into this run's ledger/rights.
        other = copy.deepcopy(run['state'])
        other['artists'][0]['totalRoyaltiesEarned'] = 999
        other['tracks'][0]['publisherOrgId'] = 'ORG_OTHER'
        self.server.store.create_run('Other run', other)
        before = self.server.store.load_run(self.run_id)
        rights = self.get('rights')['rights']
        self.assertEqual({r['rightCategory'] for r in rights}, {'master', 'publishing'})
        self.assertEqual({r['workId'] for r in rights}, {track['trackId']})
        self.assertTrue(all(r['runId'] == self.run_id for r in rights))
        self.assertEqual(self.get('licensing')['licenses'], rights)
        royalties = self.get('royalties')
        earned = before['state']['artists'][0]['totalRoyaltiesEarned']
        self.assertGreater(earned, 0)
        self.assertEqual(royalties['totalsByKind'], {'royalty_statement': earned})
        self.assertEqual(len(royalties['entries']), 1)
        self.assertEqual(royalties['entries'][0]['netAmount'], earned)
        self.assertEqual(self.get('awards')['awards'], [{'awardId': 'test-award', 'status': 'open'}])
        after = self.server.store.load_run(self.run_id)
        self.assertEqual(after['revision'], before['revision'], 'GETs must not save the run')
        self.assertEqual(after['state'], before['state'])
        reloaded = PopulationModel(database=self.database, run_id=self.run_id, characters=_citizens())
        reloaded.save()
        restored_rights = self.get('rights')['rights']
        without_timestamp = lambda rows: [{k: v for k, v in row.items() if k != 'updatedAt'} for row in rows]
        self.assertEqual(without_timestamp(restored_rights), without_timestamp(rights))
        self.assertEqual(self.get('royalties')['totalsByKind'], royalties['totalsByKind'])

    def test_server_backfills_existing_runs_when_adding_entertainment_tables(self):
        database = Path(self.temp.name) / 'legacy-runs.db'
        store = LivingWorldStore(database)
        state = self.server.store.load_run(self.run_id)['state']
        state['artists'] = [{'artistId': 'legacy-artist', 'stageName': 'Legacy', 'totalRoyaltiesEarned': 25}]
        state['tracks'] = [{'trackId': 'legacy-track', 'artistId': 'legacy-artist'}]
        run_id = store.create_run('Legacy run', state)
        before = store.load_run(run_id)
        server = create_server(0, database, _citizens())
        try:
            with closing(sqlite3.connect(database)) as conn:
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM EntertainmentRights WHERE RunId = ?', (run_id,)).fetchone()[0], 1)
                self.assertEqual(conn.execute('SELECT SUM(NetAmount) FROM EntertainmentRevenueLedger WHERE RunId = ?', (run_id,)).fetchone()[0], 25)
            self.assertEqual(store.load_run(run_id), before, 'Projection backfill must not rewrite saved runs')
        finally:
            server.server_close()

    def test_empty_entertainment_resources_are_valid_empty_responses(self):
        self.assertEqual(self.get('rights'), {'rights': []})
        self.assertEqual(self.get('licensing'), {'licenses': []})
        self.assertEqual(self.get('royalties'), {'totalsByKind': {}, 'artists': [], 'entries': []})
        self.assertEqual(self.get('awards'), {'awards': []})


if __name__=='__main__': unittest.main()
