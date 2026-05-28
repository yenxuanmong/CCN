# ============================================
# Ludo Master Elite - Start All Servers
# ============================================
# Chay: .\start.ps1
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LUDO MASTER ELITE - STARTING UP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Start Node.js Backend (port 3001) ---
Write-Host "[1/2] Starting Node.js Backend (port 3001)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" `
    -ArgumentList "server.js" `
    -WorkingDirectory "$PSScriptRoot\server" `
    -PassThru `
    -WindowStyle Normal

Write-Host "      Backend PID: $($backend.Id)" -ForegroundColor Green
Start-Sleep -Seconds 3

# --- Start Flask Frontend (port 5000) ---
Write-Host "[2/2] Starting Flask Frontend (port 5000)..." -ForegroundColor Yellow
$env:PYTHONIOENCODING = "utf-8"
$frontend = Start-Process -FilePath "py" `
    -ArgumentList "app.py" `
    -WorkingDirectory "$PSScriptRoot\game_web" `
    -PassThru `
    -WindowStyle Normal

Write-Host "      Frontend PID: $($frontend.Id)" -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  READY!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5000" -ForegroundColor White
Write-Host "  Backend  : http://localhost:3001  (Node.js API + Socket.IO)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to STOP both servers..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# --- Stop both ---
Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Red
Stop-Process -Id $backend.Id  -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
Write-Host "Done." -ForegroundColor Green
