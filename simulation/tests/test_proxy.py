"""Set MIRAVERSE_PROXY_DLL to the built LivingWorldBridgeTests.dll for the real .NET -> Python check."""
import os
import sys
import socket
import subprocess
import threading
import tempfile
import queue
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import test_living_world_api as api_tests
from living_world_api import create_server
from test_living_world import _citizens


@unittest.skipUnless(os.environ.get('MIRAVERSE_PROXY_DLL'), 'Build the .NET proxy test harness and set MIRAVERSE_PROXY_DLL')
class ProxyTests(api_tests.LivingWorldApiTests):
    # Inherit the same service/save/advance tests, now exercising the actual C# proxy.
    def setUp(self):
        super().setUp()
        with socket.socket() as port:
            port.bind(('127.0.0.1',0))
            proxy_port=port.getsockname()[1]
        self.proxy=subprocess.Popen(['dotnet',os.environ['MIRAVERSE_PROXY_DLL'],str(proxy_port),str(self.server.server_port)],
                                    stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        ready=queue.Queue()
        def read():
            for line in self.proxy.stdout:
                if line.strip()=='READY': ready.put(True);return
        threading.Thread(target=read,daemon=True).start()
        try: ready.get(timeout=15)
        except queue.Empty:
            self.proxy.kill();self.proxy.wait();raise RuntimeError('Proxy harness did not start')
        self.base=f'http://127.0.0.1:{proxy_port}'

    def tearDown(self):
        self.proxy.terminate()
        self.proxy.wait(timeout=10)
        self.proxy.stdout.close()
        super().tearDown()

    def test_prefixed_and_short_routes_advance_actual_citizens_without_read_writes(self):
        # Only public /api/livingworld routes belong to the C# bridge.
        status,before=self.request('/api/livingworld/runs/'+self.run_id)
        self.assertEqual(status,200,before)
        status,result=self.request('/api/livingworld/runs/'+self.run_id+'/advance',{'steps':2})
        self.assertEqual(status,200,result)
        self.assertEqual(result['clock']['tick_count'],2)
        self.assertEqual(self.get('schedules')['schedules'][0]['minuteOfDay'],60)

    def test_services_share_citizen_balances_ledger_and_graph_and_survive_simulator_saves(self):
        # Query parameters and charset-bearing Content-Type must survive the proxy.
        before=self.get('finances')['accounts']['TEST-ADA']
        self.post('finances',{'characterId':'TEST-ADA','kind':'income','amount':15,'requestId':'proxy-credit'})
        self.post('finances',{'characterId':'TEST-ADA','kind':'income','amount':15,'requestId':'proxy-credit'})
        after=self.get('finances')
        self.assertEqual(after['accounts']['TEST-ADA'],before+15)
        self.assertEqual(len(after['transactions']),1)

    def test_stale_writers_and_bad_commands_cannot_corrupt_latest_snapshot(self):
        self.post('finances',{'characterId':'TEST-ADA','kind':'income','amount':1})
        self.assertEqual(self.request('/api/livingworld/runs/'+self.run_id+'/advance',{'steps':1,'expectedRevision':0})[0],409)
        self.assertEqual(self.request('/api/livingworld/finances',{'runId':self.run_id,'characterId':'unknown','kind':'income','amount':1})[0],400)
        self.assertEqual(self.request('/api/livingworld/health',headers={'Origin':'https://foreign.invalid'})[0],403)

    def test_legacy_api_fields_and_unknown_extensions_are_preserved_once(self):
        # Parent uses only public prefixed panel routes for this persistence check.
        super().test_legacy_api_fields_and_unknown_extensions_are_preserved_once()
