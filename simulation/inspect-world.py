
import sqlite3
import json
from pathlib import Path

from paths import SOURCE_DATABASE as DATABASE

connection = sqlite3.connect(
    DATABASE.as_uri() + "?mode=ro",
    uri=True
)

connection.row_factory = sqlite3.Row


def display(title, query):

    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

    rows = connection.execute(query).fetchall()

    for row in rows:

        data = dict(row)

        for key, value in data.items():

            if key.endswith("Json") and value:

                try:
                    data[key] = json.loads(value)
                except (ValueError, TypeError):
                    pass

        print(json.dumps(
            data,
            indent=2,
            ensure_ascii=False
        ))


display(
    "CHARACTER TYPES AND STATUS",
    """
    SELECT Kind, Status, COUNT(*) AS Total
    FROM Characters
    GROUP BY Kind, Status
    """
)

display(
    "CHARACTER EXAMPLES",
    """
    SELECT *
    FROM Characters
    LIMIT 3
    """
)

display(
    "PROFILE COLLECTIONS",
    """
    SELECT Collection, COUNT(*) AS Total
    FROM CharacterProfiles
    GROUP BY Collection
    """
)

display(
    "CHARACTER PROFILE EXAMPLES",
    """
    SELECT CharacterId, Collection, Context, DataJson
    FROM CharacterProfiles
    LIMIT 5
    """
)

display(
    "WORLD RECORD CATEGORIES",
    """
    SELECT Domain, Section, COUNT(*) AS Total
    FROM WorldRecords
    GROUP BY Domain, Section
    """
)

display(
    "WORLD RECORD EXAMPLES",
    """
    SELECT Domain, Section, Name, DataJson
    FROM WorldRecords
    LIMIT 3
    """
)

connection.close()
