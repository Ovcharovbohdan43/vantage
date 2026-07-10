# ReserchMarket dev launcher (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path "node_modules")) {
  Write-Host "First run — installing dependencies..." -ForegroundColor Yellow
  npm run setup
}

Write-Host ""
Write-Host "  Worker    ->  Celery (mock research pipeline)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Frontend  ->  http://localhost:3000 (or next free port)" -ForegroundColor Cyan
Write-Host "  Backend   ->  http://localhost:8000 (or next free port)" -ForegroundColor Magenta
Write-Host "  API docs  ->  http://localhost:8000/docs" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

npm run dev
