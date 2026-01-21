# TicketBuster - Start Dev Environment (Windows PowerShell)
# Launches each service in a separate terminal window for easy debugging
#
# Usage:
#   .\start-dev.ps1              # Start all services
#   .\start-dev.ps1 -SkipDocker  # Skip Docker (if already running)
#   .\start-dev.ps1 -SkipWorker  # Skip Order Worker
#
# For Linux/macOS: use start-dev-split.sh instead

param(
    [switch]$SkipDocker,
    [switch]$SkipWorker
)

$ErrorActionPreference = "Continue"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "               TicketBuster Dev Environment                    " -ForegroundColor Cyan
Write-Host "         Starting Services in Separate Windows                 " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to start a service in a new terminal
function Start-ServiceInNewWindow {
    param(
        [string]$Name,
        [string]$WorkDir,
        [string]$Command,
        [string]$Color = "White"
    )
    
    Write-Host "[*] Starting $Name..." -ForegroundColor $Color
    
    $title = "TicketBuster - $Name"
    $script = "Set-Location '$WorkDir'; `$Host.UI.RawUI.WindowTitle = '$title'; Write-Host '=== $Name ===' -ForegroundColor Cyan; $Command"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $script
    
    Start-Sleep -Seconds 1
}

# 1. Start Docker Infrastructure
if (-not $SkipDocker) {
    Write-Host ""
    Write-Host "[INFRA] Starting Docker containers..." -ForegroundColor Yellow
    
    Set-Location $ROOT_DIR
    $null = docker compose -p ticketbuster -f docker-compose.dev.yml up -d postgres rabbitmq 2>&1
    if ($LASTEXITCODE -ne 0) {
        $null = docker-compose -p ticketbuster -f docker-compose.dev.yml up -d postgres rabbitmq 2>&1
    }
    
    # Wait for PostgreSQL
    Write-Host "[INFRA] Waiting for PostgreSQL..." -ForegroundColor Yellow
    $attempts = 0
    while ($attempts -lt 20) {
        $result = docker exec ticketbuster-postgres pg_isready -U admin 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] PostgreSQL ready" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
        $attempts++
    }
    
    # Wait for RabbitMQ
    Write-Host "[INFRA] Waiting for RabbitMQ..." -ForegroundColor Yellow
    $attempts = 0
    while ($attempts -lt 20) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:15672" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
                Write-Host "[OK] RabbitMQ ready" -ForegroundColor Green
                break
            }
        } catch { }
        Start-Sleep -Seconds 2
        $attempts++
    }
}

# 2. Start Microservices in Separate Windows
Write-Host ""
Write-Host "[SERVICES] Launching services in separate windows..." -ForegroundColor Yellow

# Catalog Service (Port 3000)
Start-ServiceInNewWindow `
    -Name "Catalog Service :3000" `
    -WorkDir "$ROOT_DIR\catalog-service" `
    -Command "npm install 2>`$null; npm start" `
    -Color "Blue"

# Wait a bit for catalog to start (API Gateway depends on it)
Start-Sleep -Seconds 3

# API Gateway (Port 8000)
Start-ServiceInNewWindow `
    -Name "API Gateway :8000" `
    -WorkDir "$ROOT_DIR\api-gateway" `
    -Command "npm install 2>`$null; npm start" `
    -Color "Magenta"

# Notification Service (Port 4000)
Start-ServiceInNewWindow `
    -Name "Notification Service :4000" `
    -WorkDir "$ROOT_DIR\notification-service" `
    -Command "npm install 2>`$null; npm start" `
    -Color "DarkYellow"

# Order Worker (Python)
if (-not $SkipWorker) {
    $orderWorkerVenv = "$ROOT_DIR\order-worker\.venv\Scripts\python.exe"
    $rootVenv = "$ROOT_DIR\.venv\Scripts\python.exe"
    
    if (Test-Path $orderWorkerVenv) {
        Start-ServiceInNewWindow `
            -Name "Order Worker (Python)" `
            -WorkDir "$ROOT_DIR\order-worker" `
            -Command "& '.\.venv\Scripts\python.exe' main.py" `
            -Color "Green"
    } elseif (Test-Path $rootVenv) {
        Start-ServiceInNewWindow `
            -Name "Order Worker (Python)" `
            -WorkDir "$ROOT_DIR\order-worker" `
            -Command "& '$rootVenv' main.py" `
            -Color "Green"
    } else {
        Write-Host "[WARN] Python venv not found, skipping Order Worker" -ForegroundColor Yellow
        Write-Host "       Create venv: python -m venv .venv" -ForegroundColor DarkGray
    }
}

# Wait a bit for backend services
Start-Sleep -Seconds 3

# Frontend (Port 5173)
Start-ServiceInNewWindow `
    -Name "Frontend :5173" `
    -WorkDir "$ROOT_DIR\frontend" `
    -Command "npm install 2>`$null; npm run dev" `
    -Color "Cyan"

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                   Services Launching!                         " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Infrastructure:" -ForegroundColor Yellow
Write-Host "  PostgreSQL:     localhost:5432"
Write-Host "  RabbitMQ:       localhost:5672"
Write-Host "  RabbitMQ UI:    http://localhost:15672 (guest/guest)"
Write-Host ""
Write-Host "Microservices (each in separate window):" -ForegroundColor Yellow
Write-Host "  Catalog:        http://localhost:3000"
Write-Host "  API Gateway:    http://localhost:8000"
Write-Host "  Notifications:  http://localhost:4000"
Write-Host "  Order Worker:   (background)"
Write-Host ""
Write-Host "Frontend:" -ForegroundColor Yellow
Write-Host "  Web App:        http://localhost:5173"
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "TIP: To stop all services, close the terminal windows or use stop-dev.ps1" -ForegroundColor DarkGray
Write-Host ""
