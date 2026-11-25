from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import copy
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from living_world import RunConflictError
from living_world_api import create_server
from population import PopulationModel
from test_living_world import _citizens


class LivingWorldApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / 'runs.db'
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


if __name__=='__main__': unittest.main()
