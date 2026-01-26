# ============================================================================
# TicketBuster - Full Cleanup (Limpiar TODO incluyendo datos)
# ============================================================================
# ADVERTENCIA: Este script borra TODO incluyendo volúmenes
# Los tickets y eventos se perderán
# ============================================================================

$ErrorActionPreference = "Continue"
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Red
Write-Host "    WARNING: FULL CLEANUP" -ForegroundColor Red
Write-Host "================================================================" -ForegroundColor Red
Write-Host ""
Write-Host "Este script BORRARA:" -ForegroundColor Red
Write-Host "  [X] Todos los pods" -ForegroundColor Red
Write-Host "  [X] Todos los servicios" -ForegroundColor Red
Write-Host "  [X] Todos los volumenes (PIERDES DATOS)" -ForegroundColor Red
Write-Host "  [X] Todo el namespace ticketbuster" -ForegroundColor Red
Write-Host ""

# Confirmar
$response = Read-Host "Estás seguro de que quieres continuar? (escribe 'si' para confirmar)"

if ($response -ne "si") {
    Write-Host ""
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "    Iniciando limpieza completa..." -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""

# Paso 1: Parar port-forwards
Write-Host "[PASO 1/2] Parando port-forwards..." -ForegroundColor Blue

$portForwardProcesses = Get-Process | Where-Object {$_.Name -eq 'powershell'} | Where-Object {$_.CommandLine -like '*port-forward*'}

if ($portForwardProcesses) {
    $portForwardProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue | Out-Null
    }
    Write-Host "  [OK] Port-forwards cerrados" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No hay port-forwards activos" -ForegroundColor Cyan
}

# Paso 2: Borrar namespace completo
Write-Host ""
Write-Host "[PASO 2/2] Borrando namespace ticketbuster..." -ForegroundColor Blue
Write-Host "  (Esto borrará TODO: pods, servicios, volúmenes, datos...)" -ForegroundColor DarkGray

kubectl delete namespace $NAMESPACE --ignore-not-found=true 2>&1 | Out-Null

# Esperar a que se borre
Write-Host "  Esperando a que el namespace se elimine..." -ForegroundColor DarkGray
Start-Sleep -Seconds 10

# Verificar que se borró
$nsExists = kubectl get namespace $NAMESPACE 2>&1

if ($nsExists -like "*not found*" -or $nsExists -like "*No resources found*") {
    Write-Host "  [OK] Namespace eliminado" -ForegroundColor Green
} else {
    Write-Host "  [WARN] El namespace aún existe, esperando..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "          [OK] LIMPIEZA COMPLETA FINALIZADA" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Todos los datos han sido eliminados." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para reiniciar desde cero, ejecuta:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\scripts\test-k8s-completo.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Esto creara un namespace nuevo con base de datos vacia." -ForegroundColor DarkGray
Write-Host ""
