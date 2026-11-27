from __future__ import annotations
import argparse
import copy
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse, unquote

from living_world import LivingWorldStore, RunConflictError, WorldClock, validate_calendar_config
from population import PopulationModel
import world_services
import entertainment

from paths import RUN_DATABASE as DATABASE
CORE_FIELDS = {'format_version','seed','clock','calendar','playing','random_state','citizens'}
READERS = {'careers':world_services.list_careers,'finances':world_services.list_finances,
           'relationships':world_services.list_relationships,'events':world_services.list_events}
WRITERS = {'careers':world_services.assign_career,'finances':world_services.transact,
           'relationships':world_services.add_relationship,'events':world_services.add_event}
ENT_READ = {
    'artists': entertainment.list_artists,
    'music': entertainment.list_music,
    'releases': entertainment.list_releases,
    'concerts': entertainment.list_concerts,
    'auditions': entertainment.list_auditions,
    'contracts': entertainment.list_contracts,
    'productions': entertainment.list_productions,
    'tickets': entertainment.list_tickets,
    'entertainment': entertainment.industry_snapshot,
    'projects': entertainment.list_projects,
    'rights': entertainment.list_rights,
    'licensing': entertainment.list_licensing,
    'royalties': entertainment.list_royalties,
    'charts': entertainment.list_charts,
    'media': entertainment.list_media,
    'memberships': entertainment.list_memberships,
    'bookings': entertainment.list_bookings,
    'tours': entertainment.list_tours,
    'broadcasting': entertainment.list_broadcasting,
    'campaigns': entertainment.list_campaigns,
    'awards': entertainment.list_awards,
    'organizations': entertainment.list_organizations,
}
ENT_WRITE = {
    'artists': entertainment.upsert_artist,
    'music': entertainment.add_track,
    'releases': entertainment.schedule_release,
    'concerts': entertainment.schedule_concert,
    'auditions': entertainment.handle_audition,
    'contracts': entertainment.manage_contract,
    'productions': entertainment.create_or_advance_production,
    'tickets': entertainment.purchase_ticket,
    'publicity': entertainment.handle_publicity_or_fan_action,
    'projects': entertainment.create_or_advance_production,
}


class LivingWorldHandler(BaseHTTPRequestHandler):
    server_version = 'MiraverseLivingWorld/2.0'

    def log_message(self, fmt, *args):
        return

    def _send(self, status, payload):
        body=json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        path=urlparse(self.path).path.rstrip('/')
        if path == '/api/livingworld': path=''
        elif path.startswith('/api/livingworld/'): path=path[len('/api/livingworld'):]
        return path,parse_qs(urlparse(self.path).query)

    def _read_json(self):
        if self.headers.get('Content-Type','').split(';')[0].strip() != 'application/json':
            raise ValueError('Content-Type must be application/json')
        length=int(self.headers.get('Content-Length') or 0)
        if not 0 < length <= 4*1024*1024: raise ValueError('invalid request body size')
        def reject(value): raise ValueError(f'Non-finite JSON value: {value}')
        value=json.loads(self.rfile.read(length).decode('utf-8'),parse_constant=reject)
        if not isinstance(value,dict): raise ValueError('request body must be a JSON object')
        return value

    def _origin_allowed(self):
        origin=self.headers.get('Origin')
        if not origin: return True
        parsed=urlparse(origin)
        return parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1') and parsed.port==self.server.server_port

    def do_OPTIONS(self):
        self._send(204 if self._origin_allowed() else 403,{})

    def do_GET(self): self._handle(False)
    def do_POST(self): self._handle(True)

    def _model(self,run_id):
        return PopulationModel(database=self.server.database,run_id=run_id,characters=self.server.characters)

    @staticmethod
    def _envelope(model):
        return {'run_id':model.run_id,'name':model.run_name,'revision':model._revision,
                'calendar':model.calendar_config,'state':model._export_state()}

    def _entertainment(self,name,model,body=None):
        if name=='organizations' and body is None:
            return entertainment.list_organizations(model)
        run=self._envelope(model)
        if body is None: return ENT_READ[name](run)
        body=copy.deepcopy(body)
        state=run['state']
        if name=='artists':
            char_id = str(body.get('characterId') or '')
            if char_id:
                world_services.citizen(model, char_id)
            if not isinstance(body.get('genres',[]),list) or any(not isinstance(v,str) for v in body.get('genres',[])):
                raise ValueError('genres must be a list of strings')
            for axis in entertainment.FAME_AXES:
                if axis in body and body[axis] is not None:
                    body[axis] = world_services.number(body[axis], axis, 0, 100)
        if name in ('music','concerts'):
            if not any(a.get('artistId')==body.get('artistId') for a in state.get('artists',[])):
                raise ValueError('artistId must reference an artist in this run')
        if name=='music':
            duration=body.get('durationSeconds',0)
            if type(duration) is not int or not 0 <= duration <= 86400: raise ValueError('durationSeconds must be 0-86400')
        if name=='releases':
            if not any(t.get('trackId')==body.get('trackId') for t in state.get('tracks',[])): raise ValueError('trackId must reference a track in this run')
            body['royaltyRate']=world_services.number(body.get('royaltyRate',0),'royaltyRate',0,1)
        if name=='concerts':
            body['ticketPrice']=world_services.number(body.get('ticketPrice',0),'ticketPrice',0,1e12)
            capacity=body.get('capacity',0)
            if type(capacity) is not int or not 0 <= capacity <= 1000000: raise ValueError('capacity must be 0-1000000')
            if not str(body.get('venue') or '').strip(): raise ValueError('venue is required')
        result=ENT_WRITE[name](run,body)
        model._extensions={k:v for k,v in run['state'].items() if k not in CORE_FIELDS}
        return result

    def _handle(self,post):
        try:
            if not self._origin_allowed(): self._send(403,{'error':'Foreign origins are not permitted'});return
            path,query=self._route()
            if not post and path=='/health': self._send(200,{'service':'miraverse-living-world','schemaVersion':1});return
            if not post and path=='/runs': self._send(200,{'runs':self.server.store.list_runs()});return
            body=self._read_json() if post else None
            if body and 'expectedRevision' in body and (type(body['expectedRevision']) is not int or body['expectedRevision'] < 0):
                raise ValueError('expectedRevision must be a nonnegative integer')
            if post and path=='/runs':
                supplied=body.get('state',{})
                if not isinstance(supplied,dict): raise ValueError('state must be an object')
                clock=WorldClock.from_state(supplied['clock']) if 'clock' in supplied else None
                calendar=validate_calendar_config(body.get('calendar') or supplied.get('calendar') or self.server.default_calendar)
                model=PopulationModel(seed=body.get('seed',supplied.get('seed',42)),database=self.server.database,
                    characters=self.server.characters,step_minutes=clock.step_minutes if clock else body.get('stepMinutes',30),calendar_config=calendar,persist=False)
                if supplied:
                    if clock: model.world_clock=clock
                    model._extensions.update({k:v for k,v in supplied.items() if k not in CORE_FIELDS})
                    for c in model.agents:
                        if c.character_id in supplied.get('citizens',{}): c.restore_runtime_state(supplied['citizens'][c.character_id])
                    model._restore_service_state();model._rebuild_world_graph()
                model.run_name=str(body.get('name') or model.run_name)
                model.run_id=model.store.create_run(model.run_name,model._export_state())
                self._send(201,{'runId':model.run_id,'revision':model._revision});return
            parts=path.strip('/').split('/')
            name=parts[0]
            if name=='runs' and len(parts) in (2,3):
                run_id=unquote(parts[1]);operation=parts[2] if len(parts)==3 else 'get'
            elif name in (*READERS,*ENT_READ,*ENT_WRITE,'schedules','fame') and len(parts)==1:
                run_id=str(body.get('runId') or '') if post else (query.get('runId') or [''])[0]
                operation=name
            else: self._send(404,{'error':'Unknown living-world route'});return
            if not run_id: raise ValueError('runId is required')
            with self.server.run_lock(run_id):
                model=self._model(run_id)
                if body and 'expectedRevision' in body and body['expectedRevision'] != model._revision:
                    raise RunConflictError('This run changed in another client. Reload before retrying.')
                if not post:
                    if operation=='get':
                        self._send(200,{'run':self._envelope(model),'clock':model.world_clock.to_state(),'date':model.current_world_date(),
                            'transactions':model.store.recent_transactions(run_id,20)});return
                    if operation in READERS: self._send(200,READERS[operation](model));return
                    if operation in ENT_READ: self._send(200,self._entertainment(operation,model));return
                    if operation=='fame':
                        artist_id=(query.get('artistId') or query.get('id') or [''])[0].strip()
                        run=self._envelope(model)
                        if artist_id:
                            self._send(200,entertainment.fame_profile(run,artist_id))
                        else:
                            self._send(200,{'fameProfiles':[entertainment.fame_profile(run,a['artistId']) for a in run['state'].get('artists',[])]})
                        return
                    if operation=='schedules':
                        self._send(200,{'runId':run_id,'schedules':[{'characterId':c.character_id,'name':c.name,
                            'mode':c.schedule_mode,'minuteOfDay':model.world_clock.minute_of_day,
                            'blocks':copy.deepcopy(c.daily_schedule) if c.eligible_for_living_sim else []} for c in model.agents]});return
                else:
                    if operation=='advance':
                        model.advance_steps(body.get('steps',1))
                        self._send(200,{'runId':run_id,'revision':model._revision,'clock':model.world_clock.to_state(),'date':model.current_world_date()});return
                    if operation=='save':
                        if 'expectedRevision' not in body: raise ValueError('expectedRevision is required for snapshot saves')
                        state=body.get('state')
                        if not isinstance(state,dict) or state.get('clock') != model.world_clock.to_state() or state.get('citizens') != model._export_state()['citizens']:
                            raise ValueError('Use simulation and service commands to update clock or citizens')
                        managed={'careers','relationships','accounts','artists','entertainmentStaff','organizationStates','tracks','releases','concerts','auditions','entertainment_contracts','productions','tickets','sponsorships','media_items','controversies','awards','fan_communities','events','transactions','legacy_service_state'}
                        if any(state.get(k) != model._extensions.get(k) for k in managed):
                            raise ValueError('Use service commands to update managed collections')
                        model._extensions.update({k:v for k,v in state.items() if k not in CORE_FIELDS});model.save()
                        self._send(200,{'runId':run_id,'revision':model._revision});return
                    if operation in WRITERS or operation in ENT_WRITE:
                        result=WRITERS[operation](model,body) if operation in WRITERS else self._entertainment(operation,model,body)
                        if not result.get('alreadyApplied'): model.save()
                        self._send(200,{'result':result,'revision':model._revision});return
                self._send(404,{'error':'Unknown living-world operation'})
        except RunConflictError as exc: self._send(409,{'error':str(exc)})
        except KeyError as exc: self._send(404,{'error':str(exc)})
        except (ValueError,TypeError,OverflowError) as exc: self._send(400,{'error':str(exc)})
        except Exception as exc: self._send(500,{'error':str(exc)})


def create_server(port=5010,database=DATABASE,characters=None):
    from living_world import DEFAULT_CALENDAR_CONFIG
    from paths import SOURCE_DATABASE
    if characters is None and not SOURCE_DATABASE.is_file():
        raise FileNotFoundError(f'Canonical database missing: {SOURCE_DATABASE}. Configure MIRAVERSE_SOURCE_DATABASE.')
    server=ThreadingHTTPServer(('127.0.0.1',port),LivingWorldHandler)
    server.database=Path(database);server.characters=characters
    server.store=LivingWorldStore(server.database);server.default_calendar=DEFAULT_CALENDAR_CONFIG
    server._locks={};server._locks_guard=threading.Lock()
    def lock(run_id):
        with server._locks_guard: return server._locks.setdefault(run_id,threading.RLock())
    server.run_lock=lock
    return server


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('legacy_port',nargs='?',type=int)
    parser.add_argument('--port',type=int,default=5010)
    parser.add_argument('--database',type=Path,default=DATABASE)
    args=parser.parse_args()
    server=create_server(args.legacy_port if args.legacy_port is not None else args.port,args.database)
    print(f'[LivingWorld] listening on http://127.0.0.1:{server.server_port}',flush=True)
    server.serve_forever()

if __name__=='__main__': main()
