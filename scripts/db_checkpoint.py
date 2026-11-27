"""Take a deliberate, vacuumed checkpoint of the canonical SQLite database.

The live database is runtime state and is no longer tracked. This script folds
the write-ahead log into the main file and writes a compact copy under
``backups/db/`` so a snapshot can be archived on purpose rather than on every
commit.

Usage: python scripts/db_checkpoint.py [--source miraverse.db] [--out backups/db]
"""

from __future__ import annotations

import argparse
import datetime
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', default='miraverse.db')
    parser.add_argument('--out', default='backups/db')
    args = parser.parse_args()

    source = (ROOT / args.source).resolve()
    if not source.exists():
        print(f'No database at {source}; nothing to checkpoint.')
        return 1

    out_dir = (ROOT / args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    target = out_dir / f'{source.stem}-{stamp}.db'
    if target.exists():
        print(f'Checkpoint {target} already exists; refusing to overwrite.')
        return 1

    with sqlite3.connect(source) as live:
        live.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        live.execute(f"VACUUM INTO '{str(target).replace(chr(39), chr(39) * 2)}'")

    with sqlite3.connect(target) as snapshot:
        status = snapshot.execute('PRAGMA integrity_check').fetchone()[0]

    print(f'Checkpoint written: {target.relative_to(ROOT)}')
    print(f'integrity_check: {status}')
    print(f'Size: {target.stat().st_size / 1048576:.1f} MB')
    return 0 if status == 'ok' else 1


if __name__ == '__main__':
    raise SystemExit(main())
