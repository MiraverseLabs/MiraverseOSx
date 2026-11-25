import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest


class WorknetDataOwnershipTests(unittest.TestCase):
    def test_sqlite_export_cannot_overwrite_authored_catalogs(self):
        spec = importlib.util.spec_from_file_location('worknet_build_data', Path(__file__).with_name('build_data.py'))
        build = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(build)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog = [{'id': 'dga', 'baseSalaryCredits': 240}]
            (root / 'careers.json').write_text(json.dumps(catalog), encoding='utf-8')
            (root / 'missions.json').write_text('[{"id":"authored"}]', encoding='utf-8')
            original = {name: (root / name).read_bytes() for name in ['careers.json', 'missions.json']}
            db = root / 'world.db'
            with sqlite3.connect(db) as connection:
                connection.execute('CREATE TABLE Careers (id TEXT)')
                connection.execute('INSERT INTO Careers VALUES ("CAR001")')
                connection.execute('CREATE TABLE Missions (id TEXT)')
                connection.execute('INSERT INTO Missions VALUES ("legacy-mission")')
                connection.execute('CREATE TABLE CharacterProfiles (DataJson TEXT)')
                connection.execute('INSERT INTO CharacterProfiles VALUES (\'{"secret":"private case fact"}\')')
            connection.close()
            build.DB_PATH, build.OUT_DIR = str(db), str(root)
            with contextlib.redirect_stdout(io.StringIO()):
                build.main()
            for name, contents in original.items():
                self.assertEqual((root / name).read_bytes(), contents)
            self.assertEqual(json.loads((root / 'generated/sqlite/Careers.json').read_text())[0]['id'], 'CAR001')
            self.assertEqual(json.loads((root / 'generated/sqlite/Missions.json').read_text())[0]['id'], 'legacy-mission')
            self.assertEqual(json.loads((root / 'worldData.json').read_text())['careers'], catalog)
            self.assertFalse((root / 'CharacterProfiles.json').exists())


if __name__ == '__main__':
    unittest.main()
