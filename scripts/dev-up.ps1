# ============================================================================
# TicketBuster - Dev Up (Reiniciar servicios en Kubernetes)
# ============================================================================
# Este script reinicia los servicios después de un full-stop
# Sin perder datos (usa los volúmenes persistentes existentes)
# ============================================================================

$ErrorActionPreference = "Continue"
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    TICKETBUSTER - REINICIAR SERVICIOS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el namespace existe
$nsExists = kubectl get namespace $NAMESPACE 2>&1
if ($nsExists -like "*not found*") {
    Write-Host "[ERROR] Namespace ticketbuster no existe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta primero:" -ForegroundColor Yellow
    Write-Host "  .\scripts\test-k8s-completo.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "[PASO 1/2] Escalando deployments a 2 replicas..." -ForegroundColor Yellow

# Obtener lista de deployments
$deployments = kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>&1

if (-not $deployments -or $deployments -like "*No resources found*") {
    Write-Host "[ERROR] No se encontraron deployments" -ForegroundColor Red
    Write-Host ""
    Write-Host "El namespace existe pero no hay deployments." -ForegroundColor Yellow
    Write-Host "Ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\scripts\test-k8s-completo.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "  Deployments encontrados: $deployments" -ForegroundColor Blue

# Escalar cada deployment
$deploymentList = $deployments -split '\s+'
foreach ($deployment in $deploymentList) {
    if ($deployment) {
        # Solo 1 replica para postgres y rabbitmq (bases de datos)
        if ($deployment -eq "postgres" -or $deployment -eq "rabbitmq") {
            Write-Host "  Escalando $deployment a 1 replica..." -ForegroundColor DarkGray
            kubectl scale deployment/$deployment --replicas=1 -n $NAMESPACE 2>&1 | Out-Null
        } else {
            Write-Host "  Escalando $deployment a 2 replicas..." -ForegroundColor DarkGray
            kubectl scale deployment/$deployment --replicas=2 -n $NAMESPACE 2>&1 | Out-Null
        }
    }
}

Write-Host "  [OK] Deployments escalados" -ForegroundColor Green

# Paso 2: Esperar a que los pods estén listos
Write-Host ""
Write-Host "[PASO 2/2] Esperando a que los pods esten listos..." -ForegroundColor Yellow
Write-Host "  (Esto puede tardar 1-2 minutos...)" -ForegroundColor DarkGray
Write-Host ""

# Esperar a PostgreSQL primero (es crítico)
Write-Host "  Esperando PostgreSQL..." -ForegroundColor Blue
$waited = 0
$maxWait = 60
while ($waited -lt $maxWait) {
    $pgPods = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[*].status.phase}' 2>&1
    if ($pgPods -eq "Running") {
        Write-Host "  [OK] PostgreSQL listo" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "." -NoNewline -ForegroundColor DarkGray
}
Write-Host ""

# Esperar a RabbitMQ
Write-Host "  Esperando RabbitMQ..." -ForegroundColor Blue
$waited = 0
while ($waited -lt $maxWait) {
    $rmqPods = kubectl get pods -n $NAMESPACE -l app=rabbitmq -o jsonpath='{.items[*].status.phase}' 2>&1
    if ($rmqPods -eq "Running") {
        Write-Host "  [OK] RabbitMQ listo" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "." -NoNewline -ForegroundColor DarkGray
}
Write-Host ""

# Esperar a los demás servicios (backend)
Write-Host "  Esperando servicios backend..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Esperar a frontend
Write-Host "  Esperando frontend..." -ForegroundColor Blue
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "  [INFO] Estado actual de los pods:" -ForegroundColor Blue
kubectl get pods -n $NAMESPACE

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "          [OK] SERVICIOS REINICIADOS" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso: Abrir acceso local" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\scripts\start-port-forwards.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Luego accede a: http://localhost:5173" -ForegroundColor Green
Write-Host ""
