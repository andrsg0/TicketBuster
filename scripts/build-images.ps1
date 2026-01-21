# ============================================================================
# Build Docker Images for Kubernetes
# ============================================================================

$ErrorActionPreference = "Stop"
$ROOT_DIR = $PSScriptRoot | Split-Path

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         Building Docker Images for TicketBuster" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{Name="frontend"; Path="frontend"},
    @{Name="api-gateway"; Path="api-gateway"},
    @{Name="catalog-service"; Path="catalog-service"},
    @{Name="notification-service"; Path="notification-service"},
    @{Name="order-worker"; Path="order-worker"}
)

foreach ($service in $services) {
    $name = $service.Name
    $path = $service.Path
    
    Write-Host "[BUILD] $name..." -ForegroundColor Blue
    
    Set-Location "$ROOT_DIR\$path"
    
    # Copiar proto files si no existen
    if (-not (Test-Path "proto")) {
        Write-Host "  [COPY] proto files to $name..." -ForegroundColor DarkGray
        Copy-Item -Path "$ROOT_DIR\proto" -Destination "proto" -Recurse -Force
    }
    
    docker build -t "ticketbuster/${name}:latest" . 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $name built successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to build $name" -ForegroundColor Red
        exit 1
    }
}

Set-Location $ROOT_DIR

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "         All images built successfully!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images created:" -ForegroundColor Yellow
docker images | Select-String "ticketbuster"
Write-Host ""
