# ============================================================================
# TicketBuster - Verificar Inicializacion de Base de Datos
# ============================================================================
# Este script verifica que la base de datos este correctamente inicializada
# y muestra estadisticas de datos
# ============================================================================

$ErrorActionPreference = "Continue"
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    VERIFICACION DE BASE DE DATOS - TICKETBUSTER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que postgres esta corriendo
$pgPod = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>&1

if (-not $pgPod) {
    Write-Host "[ERROR] No se encontro el pod de PostgreSQL" -ForegroundColor Red
    Write-Host "Ejecuta primero: .\scripts\deploy-local.ps1" -ForegroundColor Yellow
    exit 1
}

$pgStatus = kubectl get pod -n $NAMESPACE $pgPod -o jsonpath='{.status.phase}' 2>&1
Write-Host "[INFO] Estado del pod PostgreSQL: $pgStatus" -ForegroundColor Blue

if ($pgStatus -ne "Running") {
    Write-Host "[ERROR] PostgreSQL no esta corriendo" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[CHECK 1] Verificando schemas..." -ForegroundColor Yellow
$schemas = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "\dn" 2>&1
Write-Host $schemas

Write-Host ""
Write-Host "[CHECK 2] Contando tablas por schema..." -ForegroundColor Yellow
$catalogTables = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'db_catalog';" 2>&1
$ordersTables = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'db_orders';" 2>&1
$notifTables = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'db_notifications';" 2>&1

Write-Host "  db_catalog:        $($catalogTables.Trim()) tablas" -ForegroundColor Cyan
Write-Host "  db_orders:         $($ordersTables.Trim()) tablas" -ForegroundColor Cyan
Write-Host "  db_notifications:  $($notifTables.Trim()) tablas" -ForegroundColor Cyan

Write-Host ""
Write-Host "[CHECK 3] Contando registros..." -ForegroundColor Yellow

# Eventos
$eventCount = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_catalog.events;" 2>&1
Write-Host "  Eventos:           $($eventCount.Trim())" -ForegroundColor Cyan

# Asientos
$seatCount = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_catalog.seats;" 2>&1
Write-Host "  Asientos:          $($seatCount.Trim())" -ForegroundColor Cyan

# Ordenes
$orderCount = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_orders.orders;" 2>&1
Write-Host "  Ordenes:           $($orderCount.Trim())" -ForegroundColor Cyan

Write-Host ""
Write-Host "[CHECK 4] Distribucion de asientos por estado..." -ForegroundColor Yellow
$seatStats = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT status, COUNT(*) FROM db_catalog.seats GROUP BY status ORDER BY status;" 2>&1
Write-Host $seatStats

Write-Host ""
Write-Host "[CHECK 5] Top 5 eventos con mas asientos..." -ForegroundColor Yellow
$topEvents = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -c "SELECT e.title, COUNT(s.id) as seats FROM db_catalog.events e LEFT JOIN db_catalog.seats s ON e.id = s.event_id GROUP BY e.id, e.title ORDER BY seats DESC LIMIT 5;" 2>&1
Write-Host $topEvents

Write-Host ""
Write-Host "[CHECK 6] Verificando volumen persistente..." -ForegroundColor Yellow
$pvcStatus = kubectl get pvc -n $NAMESPACE postgres-pvc -o jsonpath='{.status.phase}' 2>&1
Write-Host "  PVC Status: $pvcStatus" -ForegroundColor Cyan

if ($pvcStatus -eq "Bound") {
    Write-Host "  [OK] Volumen persistente correctamente vinculado" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Volumen persistente en estado: $pvcStatus" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "                VERIFICACION COMPLETADA" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "La base de datos tiene datos persistentes." -ForegroundColor Cyan
Write-Host "Los tickets comprados se guardaran entre sesiones." -ForegroundColor Cyan
Write-Host ""
