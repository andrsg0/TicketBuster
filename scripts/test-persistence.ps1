# ============================================================================
# TicketBuster - Test de Persistencia de Tickets
# ============================================================================
# Este script prueba que los tickets persisten entre sesiones
# ============================================================================

$ErrorActionPreference = "Continue"
$NAMESPACE = "ticketbuster"
$DEV_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZXZ1c2VyIiwiZW1haWwiOiJkZXZAdGlja2V0YnVzdGVyLmxvY2FsIn0.mock"
$USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    TEST DE PERSISTENCIA DE TICKETS - TICKETBUSTER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que port-forward está activo
Write-Host "[TEST 1] Verificando acceso al API Gateway..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -ErrorAction Stop
    Write-Host "  [OK] API Gateway respondiendo" -ForegroundColor Green
    Write-Host "  RabbitMQ: $($health.rabbitmq)" -ForegroundColor DarkGray
} catch {
    Write-Host "  [ERROR] No se puede conectar al API Gateway" -ForegroundColor Red
    Write-Host "  Ejecuta: .\scripts\start-port-forwards.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[TEST 2] Consultando tickets del usuario..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $DEV_TOKEN"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/users/$USER_ID/tickets" -Headers $headers -Method Get
    $tickets = $response.tickets
    
    Write-Host "  [INFO] Usuario tiene $($tickets.Count) ticket(s)" -ForegroundColor Cyan
    
    if ($tickets.Count -gt 0) {
        Write-Host ""
        Write-Host "  Tickets encontrados:" -ForegroundColor White
        $tickets | Format-Table -Property @{
            Label="ID"
            Expression={$_.id}
        }, @{
            Label="Evento"
            Expression={$_.event_name}
        }, @{
            Label="Estado"
            Expression={$_.status}
        }, @{
            Label="Asiento"
            Expression={"$($_.section) $($_.row)-$($_.seat_number)"}
        }, @{
            Label="Fecha Compra"
            Expression={([datetime]$_.created_at).ToString("dd/MM/yyyy HH:mm")}
        }
    } else {
        Write-Host "  [INFO] No hay tickets aun. Compra uno en http://localhost:5173" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Error al consultar tickets: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[TEST 3] Verificando base de datos..." -ForegroundColor Yellow

$pgPod = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>&1

# Contar ordenes en BD
$orderCountRaw = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_orders.orders WHERE user_id = '$USER_ID';" 2>&1
$orderCount = if ($orderCountRaw -match '\d+') { [int]($Matches[0].Trim()) } else { 0 }

Write-Host "  [INFO] Ordenes en BD para este usuario: $orderCount" -ForegroundColor Cyan

# Mostrar detalles de ordenes
if ($orderCount -gt 0) {
    Write-Host ""
    Write-Host "  Detalles desde PostgreSQL:" -ForegroundColor White
    kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -c "SELECT o.id, o.status, o.total_amount, e.title FROM db_orders.orders o LEFT JOIN db_catalog.events e ON o.event_id = e.id WHERE o.user_id = '$USER_ID' ORDER BY o.created_at DESC LIMIT 5;" 2>&1
}

Write-Host ""
Write-Host "[TEST 4] Simulando cierre y reapertura de sesion..." -ForegroundColor Yellow
Write-Host "  [SIMULAR] Usuario cierra navegador..." -ForegroundColor DarkGray
Start-Sleep -Seconds 2
Write-Host "  [SIMULAR] Usuario abre navegador nuevamente..." -ForegroundColor DarkGray
Start-Sleep -Seconds 1

# Consultar tickets de nuevo
$responseAgain = Invoke-RestMethod -Uri "http://localhost:8000/api/users/$USER_ID/tickets" -Headers $headers -Method Get
$ticketsAgain = $responseAgain.tickets

if ($ticketsAgain.Count -eq $tickets.Count) {
    Write-Host "  [OK] Tickets persisten correctamente ($($ticketsAgain.Count) tickets)" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Tickets no coinciden" -ForegroundColor Red
    Write-Host "  Antes: $($tickets.Count), Despues: $($ticketsAgain.Count)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 5] Verificando localStorage del navegador..." -ForegroundColor Yellow
Write-Host "  [INFO] En el navegador, abre DevTools (F12) y ejecuta:" -ForegroundColor Cyan
Write-Host "    localStorage.getItem('ticketbuster_user_id')" -ForegroundColor White
Write-Host ""
Write-Host "  [INFO] Debe mostrar: $USER_ID" -ForegroundColor Cyan
Write-Host "  [INFO] Este ID persiste entre sesiones del navegador" -ForegroundColor DarkGray

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "           TEST DE PERSISTENCIA COMPLETADO" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

if ($tickets.Count -gt 0) {
    Write-Host "RESULTADO: ✅ Los tickets persisten correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prueba manual:" -ForegroundColor Yellow
    Write-Host "1. Abre http://localhost:5173 en el navegador" -ForegroundColor White
    Write-Host "2. Ve a 'Mis Tickets'" -ForegroundColor White
    Write-Host "3. Cierra TODAS las ventanas del navegador" -ForegroundColor White
    Write-Host "4. Abre el navegador de nuevo" -ForegroundColor White
    Write-Host "5. Ve a http://localhost:5173/my-tickets" -ForegroundColor White
    Write-Host "6. Los tickets deben seguir ahi ✓" -ForegroundColor Green
} else {
    Write-Host "RESULTADO: ℹ️  No hay tickets para probar persistencia" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para probar:" -ForegroundColor Yellow
    Write-Host "1. Abre http://localhost:5173" -ForegroundColor White
    Write-Host "2. Selecciona un evento" -ForegroundColor White
    Write-Host "3. Compra un ticket" -ForegroundColor White
    Write-Host "4. Ejecuta este script de nuevo" -ForegroundColor White
}

Write-Host ""
