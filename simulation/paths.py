from pathlib import Path
import os

REPOSITORY = Path(os.environ.get("MIRAVERSE_REPOSITORY", Path(__file__).resolve().parent.parent)).resolve()
SOURCE_DATABASE = Path(os.environ.get("MIRAVERSE_SOURCE_DATABASE", REPOSITORY / "miraverse.db"))
if not SOURCE_DATABASE.exists() and not os.environ.get("MIRAVERSE_SOURCE_DATABASE"):
    SOURCE_DATABASE = Path.cwd() / "miraverse.db"
RUN_DATABASE = Path(os.environ.get("MIRAVERSE_RUN_DATABASE", SOURCE_DATABASE))
STATE_DIRECTORY = Path(os.environ.get("MIRAVERSE_SIMULATION_STATE_DIRECTORY", Path(__file__).resolve().parent / "state"))
WORLD_REFERENCE = Path(os.environ.get("MIRAVERSE_WORLD_REFERENCE", REPOSITORY / "frontend/src/game-content/places/places.json"))
if not WORLD_REFERENCE.exists() and not os.environ.get("MIRAVERSE_WORLD_REFERENCE"):
    WORLD_REFERENCE = Path(__file__).resolve().parent / "content/places.json"
OVERRIDES_FILE = Path(os.environ.get("MIRAVERSE_OVERRIDES_FILE", STATE_DIRECTORY / "staged_population_overrides.json"))
