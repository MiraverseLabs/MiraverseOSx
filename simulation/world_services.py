from __future__ import annotations
import copy
import math
import uuid
from datetime import datetime, timezone


def number(value, name, minimum=None, maximum=None):
    if isinstance(value, bool):
        raise ValueError(f'{name} must be a finite number')
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f'{name} must be a finite number') from None
    if not math.isfinite(result) or (minimum is not None and result < minimum) or (maximum is not None and result > maximum):
        raise ValueError(f'{name} is outside its allowed range')
    return result


def citizen(model, character_id):
    found = next((c for c in model.agents if c.character_id == character_id), None)
    if found is None:
        raise ValueError('characterId must identify a citizen in this run')
    return found


def list_careers(model):
    return {'careers': [copy.deepcopy(c.employment) if c.employment else {
        'characterId': c.character_id, 'title': c.primary_occupation, 'employer': c.workplace,
        'schedule': c.schedule_mode, 'source': 'canonical profile',
    } for c in model.agents if c.employment or c.primary_occupation]}


def assign_career(model, payload):
    worker = citizen(model, str(payload.get('characterId') or '').strip())
    if not worker.eligible_for_living_sim:
        raise ValueError('Employment requires a participating living citizen')
    title = str(payload.get('title') or '').strip()
    if not title:
        raise ValueError('title is required')
    schedule = str(payload.get('schedule') or 'flexible').casefold()
    if schedule not in ('fixed', 'flexible', 'dynamic'):
        raise ValueError('schedule must be fixed, flexible or dynamic')
    record = {'assignmentId': str(uuid.uuid4()), 'characterId': worker.character_id, 'title': title,
              'employer': str(payload.get('employer') or ''), 'salary': number(payload.get('salary', 0), 'salary', 0, 1e12),
              'salaryPeriod': 'daily', 'schedule': schedule, 'assignedAt': datetime.now(timezone.utc).isoformat()}
    if payload.get('salaryPeriod', 'daily') != 'daily':
        raise ValueError('salaryPeriod must be daily')
    model._extensions.setdefault('careers', []).append(record)
    model._restore_service_state()
    model._rebuild_world_graph()
    return copy.deepcopy(record)


def list_finances(model):
    return {'accounts': {c.character_id: c.balance for c in model.agents},
            'savings': {c.character_id: c.savings for c in model.agents},
            'transactions': model.store.recent_transactions(model.run_id, 50),
            'legacyTransactions': copy.deepcopy(model._extensions.get('transactions', [])),
            'legacyAccounts': copy.deepcopy(model._extensions.get('legacy_service_state', {}).get('accounts', {}))}


def transact(model, payload):
    account = citizen(model, str(payload.get('characterId') or '').strip())
    kind = str(payload.get('kind') or '').strip()
    if not kind:
        raise ValueError('kind is required')
    amount = number(payload.get('amount'), 'amount', -1e12, 1e12)
    if not amount:
        raise ValueError('amount must be non-zero')
    description = str(payload.get('description') or '')
    request_id = payload.get('requestId')
    tx_id = None
    if request_id is not None:
        if not isinstance(request_id, str) or not request_id.strip() or len(request_id) > 120:
            raise ValueError('requestId must be a nonempty string of at most 120 characters')
        tx_id = str(uuid.uuid5(uuid.NAMESPACE_URL, model.run_id + ':' + request_id))
        previous = model.store.transaction_by_id(model.run_id, tx_id)
        if previous:
            if any(previous[k] != v for k,v in [('character_id',account.character_id),('kind',kind),('amount',amount),('description',description)]):
                raise ValueError('requestId has already been used for a different transaction')
            return {**previous, 'alreadyApplied': True}
    if amount < 0 and account.balance + amount < 0:
        raise ValueError('insufficient funds')
    number(account.balance + amount, 'balance', -1e15, 1e15)
    model.record_transaction(account, kind, amount, description)
    if tx_id:
        model._pending_transactions[-1]['transaction_id'] = tx_id
    return copy.deepcopy(model._pending_transactions[-1])


def list_relationships(model):
    return {'relationships': copy.deepcopy(model.relationship_edges)}


def add_relationship(model, payload):
    source = citizen(model, str(payload.get('fromCharacterId') or '').strip())
    target = citizen(model, str(payload.get('toCharacterId') or '').strip())
    if source is target:
        raise ValueError('A relationship must reference two different citizens')
    record = {'relationshipId': str(uuid.uuid4()), 'fromCharacterId': source.character_id, 'toCharacterId': target.character_id,
              'kind': str(payload.get('kind') or 'acquaintance'), 'trust': number(payload.get('trust',0),'trust',0,100),
              'affection': number(payload.get('affection',0),'affection',0,100), 'updatedAt': datetime.now(timezone.utc).isoformat()}
    relationships = model._extensions.setdefault('relationships', [])
    relationships[:] = [r for r in relationships if (r.get('fromCharacterId'),r.get('toCharacterId'),r.get('kind')) != (source.character_id,target.character_id,record['kind'])]
    relationships.append(record)
    model._rebuild_world_graph()
    return copy.deepcopy(record)


def list_events(model):
    return {'events': copy.deepcopy(model._extensions.get('events', [])[-100:])}


def add_event(model, payload):
    title = str(payload.get('title') or '').strip()
    if not title:
        raise ValueError('title is required')
    record = {'eventId': str(uuid.uuid4()), 'kind': str(payload.get('kind') or 'personal'), 'title': title,
              'description': str(payload.get('description') or ''), 'worldDate': model.current_world_date(),
              'at': datetime.now(timezone.utc).isoformat()}
    model._extensions.setdefault('events', []).append(record)
    return copy.deepcopy(record)
