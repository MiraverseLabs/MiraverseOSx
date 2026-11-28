"""Persistent real-time world; experimental runs remain manually controlled."""
from __future__ import annotations

import time
from contextlib import closing

MINUTE_MS = 60_000


def unix_ms():
    return int(time.time() * 1000)


def target_minutes(anchor, now_ms=None):
    now_ms = unix_ms() if now_ms is None else now_ms
    return anchor['anchorMinutes'] + max(0, (now_ms - anchor['anchorUnixMs']) // MINUTE_MS)


def sync_model(model, now_ms=None):
    """Replay elapsed NPC time on access, including time the server was stopped.

    Player stamina and assignment state are deliberately not part of this model.
    A single optimistic save commits a catch-up, so a stale dashboard cannot
    overwrite API changes or duplicate payroll.
    """
    anchor = model._extensions.get('realtime')
    if not anchor:
        return False
    target = target_minutes(anchor, now_ms)
    if target <= model.world_clock.elapsed_minutes:
        return False
    interval = model.world_clock.step_minutes
    model._defer_persistence = True
    model._realtime_catchup = True
    try:
        while model.world_clock.elapsed_minutes < target:
            model.world_clock.set_step_minutes(min(interval, target - model.world_clock.elapsed_minutes))
            model.step()
    finally:
        model.world_clock.set_step_minutes(interval)
        model._defer_persistence = False
        model._realtime_catchup = False
    model.save()
    return True


def clock_record(server, initial_minutes=None, linked_run_id=None, now_ms=None):
    """One live run/anchor per database, shared by every browser and restart."""
    from population import PopulationModel
    now_ms = unix_ms() if now_ms is None else now_ms
    with closing(server.store._connect()) as connection:
        connection.execute('CREATE TABLE IF NOT EXISTS LivingWorldRealtime (Id INTEGER PRIMARY KEY CHECK(Id=1), RunId TEXT NOT NULL)')
        row = connection.execute('SELECT RunId FROM LivingWorldRealtime WHERE Id=1').fetchone()
        if row:
            run_id = row['RunId']
        else:
            if initial_minutes is None:
                return None
            model = PopulationModel(database=server.database, run_id=linked_run_id or None,
                                    characters=server.characters, persist=False)
            initial_minutes = max(initial_minutes, model.world_clock.elapsed_minutes)
            model.world_clock.elapsed_minutes = initial_minutes
            model._extensions['realtime'] = {'anchorUnixMs': now_ms // MINUTE_MS * MINUTE_MS, 'anchorMinutes': initial_minutes}
            model._is_playing = False
            if linked_run_id:
                model.save()
                run_id = model.run_id
            else:
                run_id = server.store.create_run('Living World · Real time', model._export_state())
            connection.execute('INSERT INTO LivingWorldRealtime(Id,RunId) VALUES(1,?)', (run_id,))
            connection.commit()
    with server.run_lock(run_id):
        model = PopulationModel(database=server.database, run_id=run_id, characters=server.characters)
        sync_model(model, now_ms)
        anchor = model._extensions['realtime']
        return {**anchor, 'runId': run_id, 'serverUnixMs': now_ms,
                'elapsedMinutes': model.world_clock.elapsed_minutes, 'revision': model._revision}


def start_worker(server):
    """Keep NPCs alive without a browser; restart catch-up uses the saved anchor."""
    import threading
    def work():
        while not server.realtime_stop.wait(10):
            try:
                with server.clock_lock:
                    clock_record(server)
            except Exception as error:
                print(f'[LivingWorld realtime] Catch-up will retry: {error}', flush=True)
    server.realtime_stop = threading.Event()
    threading.Thread(target=work, daemon=True, name='living-world-realtime').start()


def load_live_or_experiment():
    from paths import RUN_DATABASE
    from population import PopulationModel
    import sqlite3
    with closing(sqlite3.connect(RUN_DATABASE)) as connection:
        exists = connection.execute("SELECT 1 FROM sqlite_master WHERE name='LivingWorldRealtime'").fetchone()
        row = connection.execute('SELECT RunId FROM LivingWorldRealtime WHERE Id=1').fetchone() if exists else None
    model = PopulationModel(run_id=row[0]) if row else PopulationModel()
    sync_model(model)
    return model
