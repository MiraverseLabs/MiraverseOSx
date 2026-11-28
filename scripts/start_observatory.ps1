$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = $env:MIRAVERSE_PYTHON
if (-not $pythonPath) {
    $pythonPath = Join-Path $gameRoot '.venv/Scripts/python.exe'
}
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'Python environment missing. Install simulation/requirements-observatory.txt in .venv or set MIRAVERSE_PYTHON.'
}

# Scope Solara's watcher to the simulation source instead of the whole repository.
Push-Location (Join-Path $gameRoot 'simulation')
try {
    & $pythonPath -m solara run dashboard.py --host 127.0.0.1 --port 8768 --no-open --no-check-version
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
