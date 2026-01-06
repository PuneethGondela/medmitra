# Quick Server Status Check
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Med Mitra - Server Status Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Frontend (Port 3000): RUNNING" -ForegroundColor Green
    Write-Host "   → http://localhost:3000`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Frontend (Port 3000): NOT RUNNING" -ForegroundColor Red
    Write-Host "   → Run: npm run dev`n" -ForegroundColor Yellow
}

# Check Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Backend API (Port 4000): RUNNING" -ForegroundColor Green
    Write-Host "   → http://localhost:4000/health" -ForegroundColor Gray
    Write-Host "   → Status: $($data.status)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend API (Port 4000): NOT RUNNING" -ForegroundColor Red
    Write-Host "   → Run: cd backend && npm run dev`n" -ForegroundColor Yellow
}

# Check ML Server
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ ML Server (Port 8000): RUNNING" -ForegroundColor Green
    Write-Host "   → http://localhost:8000`n" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  ML Server (Port 8000): NOT RUNNING (Optional)" -ForegroundColor Yellow
    Write-Host "   → Bot will use fallback responses`n" -ForegroundColor Gray
}

Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🧪 Quick Test Links:" -ForegroundColor Yellow
Write-Host "  1. Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  2. Admin Login: http://localhost:3000/login" -ForegroundColor White
Write-Host "  3. Backend Health: http://localhost:4000/health`n" -ForegroundColor White

Write-Host "🔐 Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin:" -ForegroundColor White
Write-Host "    Email: admin@medimitra.in" -ForegroundColor Gray
Write-Host "    Mobile: 9876543210" -ForegroundColor Gray
Write-Host "    Password: admin&125`n" -ForegroundColor Gray

Write-Host "  Doctor: (Use created doctor)" -ForegroundColor White
Write-Host "    Email: [doctor email]" -ForegroundColor Gray
Write-Host "    Password: [doctor password]`n" -ForegroundColor Gray

Write-Host "  Worker: (Use created worker)" -ForegroundColor White
Write-Host "    Email: [worker email] OR Mobile: [phone]" -ForegroundColor Gray
Write-Host "    Password: [worker password]`n" -ForegroundColor Gray
