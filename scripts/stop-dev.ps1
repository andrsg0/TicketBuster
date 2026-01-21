# TicketBuster - Stop Dev Environment (Windows PowerShell)
# Stops all running services and Docker containers
#
# Usage:
#   .\stop-dev.ps1              # Stop all services and Docker
#   .\stop-dev.ps1 -KeepDocker  # Stop services but keep Docker running
#
# For Linux/macOS: use stop-all.sh instead

param(
    [switch]$KeepDocker
)

$ErrorActionPreference = "Continue"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Red
Write-Host "               TicketBuster Dev Environment                    " -ForegroundColor Red
Write-Host "                  Stopping All Services                        " -ForegroundColor Red
Write-Host "================================================================" -ForegroundColor Red
Write-Host ""

# Stop Node.js processes on specific ports
$ports = @(3000, 4000, 5173, 8000)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
               Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue |
               Select-Object -Unique
    
    if ($process) {
        Write-Host "[*] Stopping process on port $port (PID: $process)" -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

# Stop Python processes (Order Worker)
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[*] Stopping Python process (PID: $($_.Id))" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Close TicketBuster terminal windows
Get-Process powershell -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $title = $_.MainWindowTitle
        if ($title -like "*TicketBuster*") {
            Write-Host "[*] Closing window: $title" -ForegroundColor Yellow
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    } catch { }
}

# Stop Docker containers
if (-not $KeepDocker) {
    Write-Host ""
    Write-Host "[*] Stopping Docker containers..." -ForegroundColor Yellow
    Set-Location $ROOT_DIR
    docker compose -p ticketbuster -f docker-compose.dev.yml down 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose -p ticketbuster -f docker-compose.dev.yml down 2>$null
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "                  All Services Stopped                         " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
