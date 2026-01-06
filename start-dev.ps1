# Med Mitra - Development Servers Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Med Mitra Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$basePath = $PSScriptRoot
if (-not $basePath) {
    $basePath = Get-Location
}

# Check if we're in the right directory
if (-not (Test-Path "$basePath\backend\package.json")) {
    Write-Host "Error: Please run this script from the Med Mitra root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Start ML Server (Python/FastAPI) - Port 8000
Write-Host "[1/3] Starting ML Server (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$basePath\ml-server'; Write-Host 'ML Server starting on port 8000...' -ForegroundColor Cyan; if (Test-Path 'venv\Scripts\Activate.ps1') { . venv\Scripts\Activate.ps1 }; python main.py" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Node.js Backend (Express) - Port 4000
Write-Host "[2/3] Starting Node.js Backend (Port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$basePath\backend'; Write-Host 'Backend starting on port 4000...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Next.js Frontend - Port 3000
Write-Host "[3/3] Starting Next.js Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$basePath'; Write-Host 'Frontend starting on port 3000...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All servers are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers:" -ForegroundColor Yellow
Write-Host "  • ML Server:      http://localhost:8000" -ForegroundColor White
Write-Host "  • Backend API:    http://localhost:4000" -ForegroundColor White
Write-Host "  • Frontend:       http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Three PowerShell windows have been opened." -ForegroundColor Cyan
Write-Host "Keep them open while developing." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
