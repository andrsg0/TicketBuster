# ============================================================================
# TicketBuster - DETENER TODOS LOS SERVICIOS
# ============================================================================
# Este script detiene todos los servicios de TicketBuster:
# 1. Cierra las ventanas de port-forward
# 2. Opcionalmente elimina el namespace de Kubernetes
# ============================================================================

param(
    [switch]$DeleteNamespace,
    [switch]$DeleteData,
    [switch]$Help
)

$NAMESPACE = "ticketbuster"

if ($Help) {
    Write-Host ""
    Write-Host "TicketBuster - Stop All Services" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\stop-all.ps1 [opciones]"
    Write-Host ""
    Write-Host "Opciones:"
    Write-Host "  -DeleteNamespace    Elimina el namespace (detiene pods, pero preserva datos)"
    Write-Host "  -DeleteData         Elimina TODO incluyendo datos persistentes (PVCs)"
    Write-Host "  -Help               Muestra esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  .\stop-all.ps1                     # Solo cierra port-forwards"
    Write-Host "  .\stop-all.ps1 -DeleteNamespace    # Detiene pods y cierra port-forwards"
    Write-Host "  .\stop-all.ps1 -DeleteData         # Elimina TODO (reset completo)"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    TICKETBUSTER - DETENIENDO SERVICIOS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASO 1: Cerrar ventanas de port-forward
# ============================================================================
Write-Host "[PASO 1/3] Cerrando port-forwards..." -ForegroundColor Yellow

# Buscar y cerrar ventanas de PowerShell con port-forward
$portForwardWindows = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*K8s Port-Forward*"
}

if ($portForwardWindows) {
    $portForwardWindows | ForEach-Object {
        Write-Host "  Cerrando: $($_.MainWindowTitle)" -ForegroundColor DarkGray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  [OK] Ventanas de port-forward cerradas" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No hay ventanas de port-forward abiertas" -ForegroundColor DarkGray
}

# Matar procesos kubectl que estén haciendo port-forward
$kubectlProcesses = Get-Process kubectl -ErrorAction SilentlyContinue
if ($kubectlProcesses) {
    $kubectlProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Procesos kubectl detenidos" -ForegroundColor Green
}

# ============================================================================
# PASO 2: Liberar puertos (por si quedaron ocupados)
# ============================================================================
Write-Host ""
Write-Host "[PASO 2/3] Liberando puertos..." -ForegroundColor Yellow

$ports = @(5173, 8000, 9080, 4000, 15672)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -ne "System") {
                Write-Host "  Liberando puerto $port (PID: $($conn.OwningProcess))" -ForegroundColor DarkGray
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Write-Host "  [OK] Puertos liberados" -ForegroundColor Green

# ============================================================================
# PASO 3: Kubernetes (opcional)
# ============================================================================
Write-Host ""
Write-Host "[PASO 3/3] Kubernetes..." -ForegroundColor Yellow

if ($DeleteData) {
    Write-Host "  [!] Eliminando namespace Y datos persistentes..." -ForegroundColor Red
    kubectl delete namespace $NAMESPACE --ignore-not-found=true 2>&1 | Out-Null
    Write-Host "  [OK] Namespace y PVCs eliminados" -ForegroundColor Green
    Write-Host ""
    Write-Host "  [INFO] La proxima vez que ejecutes test-k8s-completo.ps1:" -ForegroundColor Cyan
    Write-Host "         - Se creara un nuevo namespace" -ForegroundColor Cyan
    Write-Host "         - Se ejecutara init.sql desde cero" -ForegroundColor Cyan
    Write-Host "         - Keycloak creara nuevos usuarios" -ForegroundColor Cyan
} elseif ($DeleteNamespace) {
    Write-Host "  Eliminando namespace (los datos en PVC se preservan)..." -ForegroundColor Blue
    kubectl delete namespace $NAMESPACE --ignore-not-found=true 2>&1 | Out-Null
    Write-Host "  [OK] Namespace eliminado" -ForegroundColor Green
    Write-Host ""
    Write-Host "  [INFO] Los PersistentVolumeClaims se mantienen." -ForegroundColor Cyan
    Write-Host "         Al reiniciar, los datos de PostgreSQL estaran disponibles." -ForegroundColor Cyan
} else {
    Write-Host "  [INFO] Los pods de Kubernetes siguen corriendo" -ForegroundColor Cyan
    Write-Host "         Usa -DeleteNamespace para detenerlos" -ForegroundColor DarkGray
    Write-Host "         Usa -DeleteData para eliminar todo" -ForegroundColor DarkGray
}

# ============================================================================
# Resumen
# ============================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "          TICKETBUSTER - SERVICIOS DETENIDOS" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# Mostrar estado actual de los pods si el namespace existe
$nsExists = kubectl get namespace $NAMESPACE --ignore-not-found 2>&1
if ($nsExists -match $NAMESPACE) {
    Write-Host "Estado actual de los pods:" -ForegroundColor Yellow
    kubectl get pods -n $NAMESPACE --no-headers 2>&1 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "Para reiniciar: .\scripts\test-k8s-completo.ps1" -ForegroundColor Cyan
Write-Host ""
