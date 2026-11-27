from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_CALENDAR_CONFIG: dict[str, Any] = {
    "version": 1,
    "era_name": "Era of Maeryn",
    "epoch_year": 0,
    "weekdays": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ],
    "weekday_offset": 0,
    "months": [
        {"name": "January", "days": 31},
        {"name": "February", "days": 28, "leap_day": True},
        {"name": "March", "days": 31},
        {"name": "April", "days": 30},
        {"name": "May", "days": 31},
        {"name": "June", "days": 30},
        {"name": "July", "days": 31},
        {"name": "August", "days": 31},
        {"name": "September", "days": 30},
        {"name": "October", "days": 31},
        {"name": "November", "days": 30},
        {"name": "December", "days": 31},
    ],
    "leap_year": {
        "divisible_by": 4,
        "century_exception": True,
        "century_cycle": 100,
        "century_divisible_by": 400,
    },
    "workdays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "seasons": [
        {"name": "Spring", "months": ["March", "April", "May"]},
        {"name": "Summer", "months": ["June", "July", "August"]},
        {"name": "Autumn", "months": ["September", "October", "November"]},
        {"name": "Winter", "months": ["December", "January", "February"]},
    ],
    "holidays": [
        {
            "name": "Founding Day",
            "month": "March",
            "day": 6,
            "recurrence": "yearly",
            "kind": "civic",
        }
    ],
    "realm_climates": {
        "Orynvell": {"season": "Perennial Equinox"},
        "Fross": {"season": "Deep Winter & Seasonal Thaw"},
        "Kaji": {"season": "Thermal Cycle"},
        "Lumia": {"season": "High Summer"},
        "Nephele": {"season": "Twilight Cycle"},
        "Marlowe": {"season": "Vernal Rebirth"},
        "Brisland": {"season": "Golden Autumn"},
        "Ve’Raylia": {"season": "Verdant Cycle"},
    },
}

MIGRATION_VERSION = 1


def _is_leap_year(year: int, leap_rule: dict[str, Any]) -> bool:
    divisor = int(leap_rule.get("divisible_by", 4))
    if divisor < 1:
        raise ValueError("leap_year.divisible_by must be a positive integer")
    if year % divisor:
        return False
    if not leap_rule.get("century_exception", True):
        return True
    century_divisor = int(leap_rule.get("century_divisible_by", 400))
    if century_divisor < 1:
        raise ValueError("leap_year.century_divisible_by must be a positive integer")
    century_cycle = int(leap_rule.get("century_cycle", divisor * 25))
    if century_cycle < 1:
        raise ValueError("leap_year.century_cycle must be a positive integer")
    if year % century_cycle:
        return True
    return year % century_divisor == 0


def validate_calendar_config(config: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(config, dict):
        raise ValueError("Calendar configuration must be a JSON object")
    months = config.get("months")
    weekdays = config.get("weekdays")
    seasons = config.get("seasons")
    holidays = config.get("holidays", [])
    if not isinstance(months, list) or not months:
        raise ValueError("Calendar configuration must define at least one month")
    month_names: list[str] = []
    for month in months:
        if not isinstance(month, dict):
            raise ValueError("Each calendar month must be an object")
        name = str(month.get("name") or "").strip()
        if not name or name.casefold() in {item.casefold() for item in month_names}:
            raise ValueError("Calendar month names must be non-empty and unique")
        if (
            not isinstance(month.get("days"), int)
            or isinstance(month["days"], bool)
            or month["days"] < 1
        ):
            raise ValueError(f"Month {name!r} must have a positive integer day count")
        month_names.append(name)
    if not isinstance(weekdays, list) or not weekdays or any(
        not isinstance(day, str) or not day.strip() for day in weekdays
    ):
        raise ValueError("Calendar configuration must define weekday names")
    if len({day.casefold() for day in weekdays}) != len(weekdays):
        raise ValueError("Calendar weekday names must be unique")
    epoch_year = config.get("epoch_year", 0)
    if not isinstance(epoch_year, int) or isinstance(epoch_year, bool):
        raise ValueError("epoch_year must be an integer")
    weekday_offset = config.get("weekday_offset", 0)
    if not isinstance(weekday_offset, int) or isinstance(weekday_offset, bool):
        raise ValueError("weekday_offset must be an integer")
    workdays = config.get("workdays", weekdays[:5])
    if not isinstance(workdays, list) or any(day not in weekdays for day in workdays):
        raise ValueError("Calendar workdays must be selected from the weekday names")
    if not isinstance(seasons, list):
        raise ValueError("Calendar seasons must be a list")
    for season in seasons:
        if not isinstance(season, dict) or not str(season.get("name") or "").strip():
            raise ValueError("Each season must have a name")
        season_months = season.get("months", [])
        if not isinstance(season_months, list) or any(
            name not in month_names for name in season_months
        ):
            raise ValueError(f"Season {season['name']!r} references an unknown month")
    if not isinstance(holidays, list):
        raise ValueError("Calendar holidays and recurring events must be a list")
    for event in holidays:
        if not isinstance(event, dict) or not str(event.get("name") or "").strip():
            raise ValueError("Each holiday or recurring event must have a name")
        recurrence = event.get("recurrence", "yearly")
        if recurrence not in ("yearly", "monthly", "weekly", "once"):
            raise ValueError(f"Unsupported event recurrence: {recurrence!r}")
        if recurrence != "weekly":
            month = event.get("month")
            if recurrence != "monthly" and month not in month_names and not (
                isinstance(month, int)
                and not isinstance(month, bool)
                and 1 <= month <= len(months)
            ):
                raise ValueError(f"Event {event['name']!r} references an unknown month")
            day = event.get("day")
            if not isinstance(day, int) or isinstance(day, bool) or day < 1:
                raise ValueError(f"Event {event['name']!r} must have a positive day")
        elif not isinstance(event.get("weekday"), str):
            raise ValueError(f"Weekly event {event['name']!r} must define a weekday")
        elif event["weekday"] not in weekdays:
            raise ValueError(f"Weekly event {event['name']!r} references an unknown weekday")
        if recurrence == "once" and (
            not isinstance(event.get("year", 0), int)
            or isinstance(event.get("year", 0), bool)
        ):
            raise ValueError(f"One-time event {event['name']!r} must define an integer year")
        if recurrence == "yearly":
            interval = event.get("every_years", 1)
            if not isinstance(interval, int) or isinstance(interval, bool) or interval < 1:
                raise ValueError(f"Event {event['name']!r} must recur every positive number of years")
    leap_rule = config.get("leap_year", {})
    if not isinstance(leap_rule, dict):
        raise ValueError("leap_year must be an object")
    normalized = json.loads(json.dumps(config))
    normalized.setdefault("version", 1)
    normalized.setdefault("era_name", "Year")
    normalized.setdefault("epoch_year", 0)
    normalized.setdefault("holidays", [])
    normalized.setdefault("realm_climates", {})
    normalized.setdefault("workdays", normalized["weekdays"][:5])
    normalized.setdefault("weekday_offset", 0)
    return normalized


class WorldClock:
    """The single in-game time source for one experimental world run."""

    def __init__(self, step_minutes: int = 30, elapsed_minutes: int = 0, tick_count: int = 0):
        self.set_step_minutes(step_minutes)
        if elapsed_minutes < 0 or tick_count < 0:
            raise ValueError("World clock elapsed time and tick count cannot be negative")
        self.elapsed_minutes = int(elapsed_minutes)
        self.tick_count = int(tick_count)

    def set_step_minutes(self, minutes: int) -> None:
        if not isinstance(minutes, int) or isinstance(minutes, bool) or not 1 <= minutes <= 1440:
            raise ValueError("Simulation interval must be an integer from 1 to 1440 minutes")
        self.step_minutes = minutes

    @property
    def day_index(self) -> int:
        return self.elapsed_minutes // 1440

    @property
    def minute_of_day(self) -> int:
        return self.elapsed_minutes % 1440

    @property
    def hour(self) -> int:
        return self.minute_of_day // 60

    @property
    def minute(self) -> int:
        return self.minute_of_day % 60

    def advance(self) -> None:
        self.elapsed_minutes += self.step_minutes
        self.tick_count += 1

    def to_state(self) -> dict[str, int]:
        return {
            "elapsed_minutes": self.elapsed_minutes,
            "step_minutes": self.step_minutes,
            "tick_count": self.tick_count,
        }

    @classmethod
    def from_state(cls, state: dict[str, Any]) -> WorldClock:
        return cls(
            step_minutes=int(state["step_minutes"]),
            elapsed_minutes=int(state["elapsed_minutes"]),
            tick_count=int(state["tick_count"]),
        )


def world_date(
    day_index: int,
    minute_of_day: int,
    config: dict[str, Any],
    *,
    realm: str = "",
    affiliation: str = "",
    _validated: bool = False,
) -> dict[str, Any]:
    if not _validated:
        config = validate_calendar_config(config)
    if day_index < 0 or not 0 <= minute_of_day < 1440:
        raise ValueError("World date offset or minute-of-day is out of range")

    month_names = [month["name"] for month in config["months"]]
    leap_rule = config.get("leap_year", {})
    year = int(config.get("epoch_year", 0))
    year_start_index = day_index
    remaining = day_index
    while True:
        year_length = sum(
            month["days"]
            + int(bool(month.get("leap_day")) and _is_leap_year(year, leap_rule))
            for month in config["months"]
        )
        if remaining < year_length:
            break
        remaining -= year_length
        year_start_index += year_length
        year += 1

    month_index = 0
    for month_index, month in enumerate(config["months"]):
        length = month["days"] + int(
            bool(month.get("leap_day")) and _is_leap_year(year, leap_rule)
        )
        if remaining < length:
            break
        remaining -= length
    month = config["months"][month_index]
    month_name = month_names[month_index]
    weekday_names = config["weekdays"]
    weekday = weekday_names[
        (day_index + int(config.get("weekday_offset", 0))) % len(weekday_names)
    ]
    season = next(
        (
            item["name"]
            for item in config["seasons"]
            if month_name in item.get("months", [])
        ),
        "Unseasonal",
    )
    hour, minute = divmod(minute_of_day, 60)
    local_climate = config.get("realm_climates", {}).get(realm, {})

    events: list[dict[str, Any]] = []
    for event in config.get("holidays", []):
        scope_realm = str(event.get("realm") or "")
        scope_affiliation = str(event.get("affiliation") or "")
        if scope_realm and scope_realm.casefold() != realm.casefold():
            continue
        if scope_affiliation and scope_affiliation.casefold() != affiliation.casefold():
            continue
        recurrence = event.get("recurrence", "yearly")
        event_month = event.get("month")
        if isinstance(event_month, int) and not isinstance(event_month, bool):
            event_month = month_names[event_month - 1] if 1 <= event_month <= len(month_names) else ""
        if recurrence == "yearly":
            interval = int(event.get("every_years", 1))
            start_year = int(event.get("start_year", 0))
            matches = (
                month_name == event_month
                and remaining + 1 == event["day"]
                and interval > 0
                and year >= start_year
                and (year - start_year) % interval == 0
            )
        elif recurrence == "monthly":
            matches = remaining + 1 == event["day"]
        elif recurrence == "weekly":
            matches = weekday.casefold() == str(event["weekday"]).casefold()
        else:
            matches = (
                year == int(event.get("year", 0))
                and month_name == event_month
                and remaining + 1 == event["day"]
            )
        if matches:
            events.append(
                {
                    "name": event["name"],
                    "kind": event.get("kind", "event"),
                    "realm": scope_realm,
                    "affiliation": scope_affiliation,
                }
            )

    return {
        "year": year,
        "era_name": config["era_name"],
        "month": month_name,
        "month_number": month_index + 1,
        "day": remaining + 1,
        "day_of_year": day_index - year_start_index,
        "weekday": weekday,
        "season": season,
        "hour": hour,
        "minute": minute,
        "time": f"{hour:02d}:{minute:02d}",
        "realm": realm,
        "realm_climate": local_climate.get("season", ""),
        "events": events,
    }


class RunConflictError(ValueError):
    """A stale writer must reload instead of replacing another client's work."""


class LivingWorldStore:
    """Versioned, additive persistence for isolated simulation runs."""

    def __init__(self, database: Path):
        self.database = Path(database)
        self._cache_lock = threading.RLock()
        self._cache_stamp = None
        self._runs_cache: list[dict[str, Any]] | None = None
        self._tx_cache: dict[tuple[str, int], list[dict[str, Any]]] = {}
        self._migrate()

    def _database_stamp(self):
        # Every store write closes its SQLite connection. Include WAL metadata so
        # another session's committed changes also invalidate these query results.
        parts = []
        for path in (self.database, Path(str(self.database) + "-wal")):
            try:
                stat = path.stat()
                parts.append((stat.st_mtime_ns, stat.st_size))
            except FileNotFoundError:
                parts.append(None)
        return tuple(parts)

    def _refresh_query_cache(self):
        stamp = self._database_stamp()
        if stamp != self._cache_stamp:
            self._runs_cache = None
            self._tx_cache.clear()
            self._cache_stamp = stamp

    def _invalidate_query_cache(self):
        with self._cache_lock:
            self._runs_cache = None
            self._tx_cache.clear()
            self._cache_stamp = None

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA temp_store = MEMORY")
        return connection

    def _migrate(self) -> None:
        with closing(self._connect()) as connection:
            existing_tables = {
                row["name"]
                for row in connection.execute(
                    """
                    SELECT name FROM sqlite_master
                    WHERE type = 'table'
                    AND name IN (
                        'LivingWorldSchemaMigrations',
                        'LivingWorldRuns',
                        'LivingWorldTransactions'
                    )
                    """
                )
            }
            if len(existing_tables) == 3:
                applied = {
                    row["Version"]
                    for row in connection.execute(
                        "SELECT Version FROM LivingWorldSchemaMigrations"
                    )
                }
                if any(version > MIGRATION_VERSION for version in applied):
                    raise RuntimeError(
                        "The living-world database schema is newer than this application"
                    )
                if MIGRATION_VERSION in applied:
                    # Idempotently ensure additive RequestId column & unique index exist on existing DBs
                    cols = {
                        row["name"]
                        for row in connection.execute("PRAGMA table_info(LivingWorldTransactions)")
                    }
                    if "RequestId" not in cols:
                        connection.execute("BEGIN IMMEDIATE")
                        connection.execute("ALTER TABLE LivingWorldTransactions ADD COLUMN RequestId TEXT")
                        connection.execute(
                            """
                            CREATE UNIQUE INDEX IF NOT EXISTS idx_living_world_transactions_run_request
                            ON LivingWorldTransactions(RunId, RequestId)
                            WHERE RequestId IS NOT NULL AND RequestId != ''
                            """
                        )
                        connection.commit()
                    return

            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS LivingWorldSchemaMigrations (
                    Version INTEGER PRIMARY KEY,
                    Description TEXT NOT NULL,
                    AppliedAt TEXT NOT NULL
                )
                """
            )
            applied = {
                row["Version"]
                for row in connection.execute(
                    "SELECT Version FROM LivingWorldSchemaMigrations"
                )
            }
            if any(version > MIGRATION_VERSION for version in applied):
                raise RuntimeError("The living-world database schema is newer than this application")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS LivingWorldRuns (
                    RunId TEXT PRIMARY KEY,
                    Name TEXT NOT NULL,
                    CreatedAt TEXT NOT NULL,
                    UpdatedAt TEXT NOT NULL,
                    Revision INTEGER NOT NULL DEFAULT 0,
                    Status TEXT NOT NULL DEFAULT 'paused',
                    CalendarJson TEXT NOT NULL CHECK(json_valid(CalendarJson)),
                    StateJson TEXT NOT NULL CHECK(json_valid(StateJson))
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS LivingWorldTransactions (
                    TransactionId TEXT PRIMARY KEY,
                    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
                    CharacterId TEXT NOT NULL,
                    StepIndex INTEGER NOT NULL,
                    WorldDate TEXT NOT NULL,
                    Kind TEXT NOT NULL,
                    Amount REAL NOT NULL,
                    BalanceAfter REAL NOT NULL,
                    SavingsAfter REAL NOT NULL,
                    Description TEXT NOT NULL,
                    RequestId TEXT
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_living_world_transactions_run
                ON LivingWorldTransactions(RunId, StepIndex DESC)
                """
            )
            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_living_world_transactions_run_request
                ON LivingWorldTransactions(RunId, RequestId)
                WHERE RequestId IS NOT NULL AND RequestId != ''
                """
            )
            if MIGRATION_VERSION not in applied:
                connection.execute(
                    """
                    INSERT INTO LivingWorldSchemaMigrations (Version, Description, AppliedAt)
                    VALUES (?, ?, ?)
                    """,
                    (
                        MIGRATION_VERSION,
                        "Add isolated living-world simulation runs and transaction ledger",
                        datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    ),
                )
            connection.commit()

    @staticmethod
    def _json(value: Any) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True, allow_nan=False)

    def create_run(self, name: str, state: dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        calendar = validate_calendar_config(state["calendar"])
        with closing(self._connect()) as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                INSERT INTO LivingWorldRuns
                    (RunId, Name, CreatedAt, UpdatedAt, Revision, Status, CalendarJson, StateJson)
                VALUES (?, ?, ?, ?, 0, 'paused', ?, ?)
                """,
                (run_id, name, now, now, self._json(calendar), self._json(state)),
            )
            import entertainment_store
            entertainment_store.sync_run_entertainment_state(connection, run_id, state)
            connection.commit()
        self._invalidate_query_cache()
        return run_id

    def save_run(
        self,
        run_id: str,
        state: dict[str, Any],
        transactions: list[dict[str, Any]] | None = None,
        *, expected_revision: int | None = None,
    ) -> int:
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        calendar = validate_calendar_config(state["calendar"])
        status = "running" if state.get("playing") else "paused"
        with closing(self._connect()) as connection:
            connection.execute("BEGIN IMMEDIATE")
            if expected_revision is not None:
                row = connection.execute("SELECT Revision FROM LivingWorldRuns WHERE RunId = ?", (run_id,)).fetchone()
                if row is None:
                    raise KeyError(f"Living-world run {run_id!r} does not exist")
                if row["Revision"] != expected_revision:
                    raise RunConflictError("This run changed in another client. Reload the run before saving or advancing it.")
            cursor = connection.execute(
                """
                UPDATE LivingWorldRuns
                SET UpdatedAt = ?, Revision = Revision + 1, Status = ?,
                    CalendarJson = ?, StateJson = ?
                WHERE RunId = ?
                """,
                (now, status, self._json(calendar), self._json(state), run_id),
            )
            if cursor.rowcount != 1:
                raise KeyError(f"Living-world run {run_id!r} does not exist")
            for transaction in transactions or []:
                req_id = transaction.get("request_id") or None
                insert_verb = "INSERT OR IGNORE" if req_id else "INSERT"
                connection.execute(
                    f"""
                    {insert_verb} INTO LivingWorldTransactions
                        (TransactionId, RunId, CharacterId, StepIndex, WorldDate,
                         Kind, Amount, BalanceAfter, SavingsAfter, Description, RequestId)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        transaction["transaction_id"],
                        run_id,
                        transaction["character_id"],
                        transaction["step_index"],
                        transaction["world_date"],
                        transaction["kind"],
                        transaction["amount"],
                        transaction["balance_after"],
                        transaction["savings_after"],
                        transaction["description"],
                        req_id,
                    ),
                )
            import entertainment_store
            entertainment_store.sync_run_entertainment_state(connection, run_id, state)
            revision = connection.execute(
                "SELECT Revision FROM LivingWorldRuns WHERE RunId = ?",
                (run_id,),
            ).fetchone()["Revision"]
            connection.commit()
        self._runs_cache = None
        self._tx_cache.clear()
        return int(revision)

    def load_run(self, run_id: str) -> dict[str, Any]:
        with closing(self._connect()) as connection:
            row = connection.execute(
                """
                SELECT RunId, Name, CreatedAt, UpdatedAt, Revision, Status, CalendarJson, StateJson
                FROM LivingWorldRuns WHERE RunId = ?
                """,
                (run_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Living-world run {run_id!r} does not exist")
            return {
                "run_id": row["RunId"],
                "name": row["Name"],
                "created_at": row["CreatedAt"],
                "updated_at": row["UpdatedAt"],
                "revision": row["Revision"],
                "status": row["Status"],
                "calendar": json.loads(row["CalendarJson"]),
                "state": json.loads(row["StateJson"]),
            }

    def list_runs(self) -> list[dict[str, Any]]:
        with self._cache_lock:
            self._refresh_query_cache()
            if self._runs_cache is not None:
                return [dict(row) for row in self._runs_cache]
            with closing(self._connect()) as connection:
                rows = connection.execute(
                    """
                    SELECT RunId, Name, CreatedAt, UpdatedAt, Revision, Status
                    FROM LivingWorldRuns ORDER BY UpdatedAt DESC
                    """
                ).fetchall()
                result = [dict(row) for row in rows]
            self._runs_cache = result
            return [dict(row) for row in result]

    def transaction_by_id(self, run_id: str, transaction_id: str):
        with closing(self._connect()) as connection:
            row = connection.execute("""SELECT TransactionId AS transaction_id, CharacterId AS character_id,
                Kind AS kind, Amount AS amount, Description AS description, BalanceAfter AS balance_after
                FROM LivingWorldTransactions WHERE RunId = ? AND TransactionId = ?""", (run_id,transaction_id)).fetchone()
            return dict(row) if row else None

    def recent_transactions(self, run_id: str, limit: int = 20) -> list[dict[str, Any]]:
        if not 1 <= limit <= 500:
            raise ValueError("Transaction limit must be between 1 and 500")
        with self._cache_lock:
            self._refresh_query_cache()
            cache_key = (run_id, limit)
            if cache_key in self._tx_cache:
                return [dict(row) for row in self._tx_cache[cache_key]]
            with closing(self._connect()) as connection:
                rows = connection.execute(
                    """
                    SELECT TransactionId AS transaction_id, CharacterId AS character_id,
                           StepIndex AS step_index, WorldDate AS world_date, Kind AS kind,
                           Amount AS amount, BalanceAfter AS balance_after,
                           SavingsAfter AS savings_after, Description AS description
                    FROM LivingWorldTransactions
                    WHERE RunId = ?
                    ORDER BY StepIndex DESC, rowid DESC
                    LIMIT ?
                    """,
                    (run_id, limit),
                ).fetchall()
                result = [dict(row) for row in rows]
            self._tx_cache[cache_key] = result
            return [dict(row) for row in result]
