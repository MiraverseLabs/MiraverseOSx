
import sqlite3
from pathlib import Path

from paths import SOURCE_DATABASE as DATABASE

if not DATABASE.is_file():
    raise FileNotFoundError(DATABASE)

# Connect in read-only mode
connection = sqlite3.connect(
    DATABASE.as_uri() + "?mode=ro",
    uri=True
)

cursor = connection.cursor()

print("Connected to Miraverse database!")

tables = cursor.execute("""
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
""").fetchall()

print(f"\nTotal tables: {len(tables)}")

for (table,) in tables:

    safe_name = '"' + table.replace('"', '""') + '"'

    count = cursor.execute(
        f"SELECT COUNT(*) FROM {safe_name}"
    ).fetchone()[0]

    columns = cursor.execute(
        f"PRAGMA table_info({safe_name})"
    ).fetchall()

    print(f"\nTABLE: {table}")
    print(f"Records: {count}")
    print("Columns:")

    for column in columns:
        print(f"  - {column[1]} ({column[2]})")

connection.close()
