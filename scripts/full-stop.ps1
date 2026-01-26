# ============================================================================
# TicketBuster - Full Stop (Detener TODO completamente)
# ============================================================================
# Este script detiene completamente todos los servicios de forma segura
# Sin perder datos (mantiene volúmenes persistentes)
# ============================================================================

$ErrorActionPreference = "Continue"
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    TICKETBUSTER - DETENER TODO COMPLETAMENTE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Parar port-forwards
Write-Host "[PASO 1/3] Parando port-forwards..." -ForegroundColor Yellow

# Buscar procesos PowerShell con port-forward
$portForwardProcesses = Get-Process | Where-Object {$_.Name -eq 'powershell'} | Where-Object {$_.CommandLine -like '*port-forward*'}

if ($portForwardProcesses) {
    Write-Host "  Encontrados $($portForwardProcesses.Count) port-forwards" -ForegroundColor Blue
    $portForwardProcesses | ForEach-Object {
        Write-Host "  Matando PID $($_.Id)..." -ForegroundColor DarkGray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue | Out-Null
    }
    Write-Host "  [OK] Port-forwards detenidos" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No hay port-forwards activos" -ForegroundColor Cyan
}

# Paso 2: Escalar deployments a 0 réplicas
Write-Host ""
Write-Host "[PASO 2/3] Escalando deployments a 0 réplicas..." -ForegroundColor Yellow

$deployments = kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>&1

if ($deployments) {
    Write-Host "  Deployments encontrados: $deployments" -ForegroundColor Blue
    
    $deploymentList = $deployments -split '\s+'
    foreach ($deployment in $deploymentList) {
        if ($deployment) {
            Write-Host "  Escalando $deployment a 0 réplicas..." -ForegroundColor DarkGray
            kubectl scale deployment/$deployment --replicas=0 -n $NAMESPACE 2>&1 | Out-Null
        }
    }
    Write-Host "  [OK] Todos los deployments escalados a 0" -ForegroundColor Green
} else {
    Write-Host "  [WARN] No se encontraron deployments" -ForegroundColor Yellow
}

# Paso 3: Esperar a que se detengan
Write-Host ""
Write-Host "[PASO 3/3] Esperando a que los pods se detengan..." -ForegroundColor Yellow
Write-Host "  (Esperando 10 segundos...)" -ForegroundColor DarkGray

for ($i = 10; $i -gt 0; $i--) {
    Write-Host "  $i..." -ForegroundColor DarkGray -NoNewline
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host ""

# Verificar estado final
Write-Host "[VERIFICACION] Estado final:" -ForegroundColor Blue
$pods = kubectl get pods -n $NAMESPACE --no-headers 2>&1
$podCount = $pods | Measure-Object | Select-Object -ExpandProperty Count

Write-Host ""
if ($pods -like "*No resources found*" -or $podCount -eq 0) {
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "          [OK] TODOS LOS SERVICIOS DETENIDOS" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "[OK] Port-forwards cerrados" -ForegroundColor Green
    Write-Host "[OK] Pods detenidos" -ForegroundColor Green
    Write-Host "[OK] Datos persistentes mantenidos (volumenes intactos)" -ForegroundColor Green
} else {
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host "          [ESPERA] ALGUNOS PODS AUN SE ESTAN DETENIENDO" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $pods
    Write-Host ""
    Write-Host "Espera un momento y ejecuta de nuevo para verificar" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Para reiniciar, ejecuta:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\scripts\dev-up.ps1             # Reiniciar servicios" -ForegroundColor White
Write-Host "  .\scripts\start-port-forwards.ps1 # Abrir acceso local" -ForegroundColor White
Write-Host ""
Write-Host "O para un reinicio completo desde cero:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\scripts\test-k8s-completo.ps1  # Todo en uno" -ForegroundColor White
Write-Host ""
