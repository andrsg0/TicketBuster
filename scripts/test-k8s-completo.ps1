# ============================================================================
# TicketBuster - TEST COMPLETO EN KUBERNETES
# ============================================================================
# Este script hace TODO de principio a fin:
# 1. Construye las imagenes Docker
# 2. Despliega en Kubernetes
# 3. Inicia port-forwards
# 4. Abre el navegador
# ============================================================================

$ErrorActionPreference = "Continue"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    TICKETBUSTER - TEST COMPLETO EN KUBERNETES" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASO 1: Verificar prerrequisitos
# ============================================================================
Write-Host "[PASO 1/5] Verificando prerrequisitos..." -ForegroundColor Yellow

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker no encontrado" -ForegroundColor Red
    exit 1
}

if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: kubectl no encontrado" -ForegroundColor Red
    exit 1
}

$null = kubectl cluster-info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Kubernetes no esta corriendo" -ForegroundColor Red
    Write-Host "Inicia Docker Desktop y habilita Kubernetes" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Docker y Kubernetes disponibles" -ForegroundColor Green

# ============================================================================
# PASO 2: Construir imagenes Docker
# ============================================================================
Write-Host ""
Write-Host "[PASO 2/5] Construyendo imagenes Docker..." -ForegroundColor Yellow

$services = @("frontend", "api-gateway", "catalog-service", "notification-service", "order-worker")

foreach ($service in $services) {
    Write-Host "  [BUILD] $service..." -ForegroundColor Blue
    Set-Location "$ROOT_DIR\$service"
    
    # Copiar proto files si no existen
    if (-not (Test-Path "proto")) {
        Copy-Item -Path "$ROOT_DIR\proto" -Destination "proto" -Recurse -Force | Out-Null
    }
    
    $null = docker build -t "ticketbuster/${service}:latest" . 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $service" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Fallo al construir $service" -ForegroundColor Red
        exit 1
    }
}

Set-Location $ROOT_DIR
Write-Host "[OK] Todas las imagenes construidas" -ForegroundColor Green

# ============================================================================
# PASO 3: Desplegar en Kubernetes
# ============================================================================
Write-Host ""
Write-Host "[PASO 3/5] Desplegando en Kubernetes..." -ForegroundColor Yellow

# Verificar si el namespace ya existe (para preservar datos)
$namespaceExists = kubectl get namespace $NAMESPACE --ignore-not-found 2>&1
if ($namespaceExists -match $NAMESPACE) {
    Write-Host "  [INFO] Namespace '$NAMESPACE' ya existe - preservando datos" -ForegroundColor Cyan
    Write-Host "  [INFO] Para limpiar todo: kubectl delete namespace $NAMESPACE" -ForegroundColor DarkGray
} else {
    Write-Host "  Creando namespace..." -ForegroundColor Blue
    kubectl apply -f "$ROOT_DIR\k8s\namespace.yaml" 2>&1 | Out-Null
}

# Infrastructure (primero PostgreSQL y RabbitMQ, luego Keycloak)
Write-Host "  Desplegando PostgreSQL y RabbitMQ..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\infrastructure.yaml" 2>&1 | Out-Null

# Esperar a que PostgreSQL esté listo ANTES de desplegar Keycloak
Write-Host "  Esperando a que PostgreSQL este listo..." -ForegroundColor DarkGray
$maxWait = 60
$waited = 0
while ($waited -lt $maxWait) {
    $pgReady = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].status.phase}' 2>&1
    if ($pgReady -eq "Running") {
        $pgContainerReady = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>&1
        if ($pgContainerReady -eq "true") {
            Write-Host "  [OK] PostgreSQL listo" -ForegroundColor Green
            break
        }
    }
    Start-Sleep -Seconds 2
    $waited += 2
}

# Crear schema de Keycloak en PostgreSQL (necesario para persistencia)
Write-Host "  Creando schema de Keycloak en PostgreSQL..." -ForegroundColor DarkGray
$pgPod = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>&1
kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -c "CREATE SCHEMA IF NOT EXISTS keycloak;" 2>&1 | Out-Null
Write-Host "  [OK] Schema keycloak creado" -ForegroundColor Green

# Ahora desplegar Keycloak (que usará PostgreSQL)
Write-Host "  Desplegando Keycloak..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\keycloak.yaml" 2>&1 | Out-Null

Write-Host "  Esperando a que RabbitMQ este listo..." -ForegroundColor DarkGray
$waited = 0
while ($waited -lt $maxWait) {
    $rmqReady = kubectl get pods -n $NAMESPACE -l app=rabbitmq -o jsonpath='{.items[0].status.phase}' 2>&1
    if ($rmqReady -eq "Running") {
        $rmqContainerReady = kubectl get pods -n $NAMESPACE -l app=rabbitmq -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>&1
        if ($rmqContainerReady -eq "true") {
            Write-Host "  [OK] RabbitMQ listo" -ForegroundColor Green
            break
        }
    }
    Start-Sleep -Seconds 2
    $waited += 2
}

# Esperar a que Keycloak este listo (tarda mas que los demas)
Write-Host "  Esperando a que Keycloak este listo (puede tardar 1-2 min)..." -ForegroundColor DarkGray
$maxWaitKc = 120
$waited = 0
while ($waited -lt $maxWaitKc) {
    $kcReady = kubectl get pods -n $NAMESPACE -l app=keycloak -o jsonpath='{.items[0].status.phase}' 2>&1
    if ($kcReady -eq "Running") {
        $kcContainerReady = kubectl get pods -n $NAMESPACE -l app=keycloak -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>&1
        if ($kcContainerReady -eq "true") {
            Write-Host "  [OK] Keycloak listo (usuarios importados desde realm config)" -ForegroundColor Green
            break
        }
    }
    Start-Sleep -Seconds 5
    $waited += 5
}

# Dar tiempo extra para que los servicios internos inicien
Start-Sleep -Seconds 5

# Services
Write-Host "  Desplegando microservicios..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\services-deployment.yaml" 2>&1 | Out-Null

# HPA
Write-Host "  Configurando autoscaling..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\hpa.yaml" 2>&1 | Out-Null

Write-Host "[OK] Kubernetes deployment aplicado" -ForegroundColor Green

# ============================================================================
# PASO 4: Inicializar base de datos
# ============================================================================
Write-Host ""
Write-Host "[PASO 4/6] Inicializando base de datos..." -ForegroundColor Yellow

# Esperar a que postgres esté completamente listo
Start-Sleep -Seconds 5

# Obtener nombre del pod de postgres
$pgPod = kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>&1

# Verificar si la BD ya tiene datos (si la tabla no existe, el count falla y eso está bien)
$eventCountRaw = kubectl exec -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_catalog.events;" 2>&1

# Manejar caso donde el resultado es un array (tomar el primer elemento que es el número)
if ($eventCountRaw -is [array]) {
    $eventCount = ($eventCountRaw | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1) -replace '\s',''
} else {
    $eventCount = ($eventCountRaw -replace '\s','')
}

# Si el eventCount es un número > 0, skip init.sql
# Si no es un número (error porque la tabla no existe), o es 0, ejecutar init.sql
if ($eventCount -match '^\d+$' -and [int]$eventCount -gt 0) {
    Write-Host "  [SKIP] Base de datos ya tiene $eventCount eventos - datos preservados" -ForegroundColor Cyan
    Write-Host "  [INFO] Para reiniciar datos: kubectl delete pvc postgres-pvc -n $NAMESPACE" -ForegroundColor DarkGray
} else {
    Write-Host "  Ejecutando init.sql (primera ejecucion o BD vacia)..." -ForegroundColor Blue
    Get-Content -Raw "$ROOT_DIR\k8s\init.sql" | kubectl exec -i -n $NAMESPACE $pgPod -- psql -U admin -d ticketbuster -f - 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Base de datos inicializada con 20 eventos" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Posible error en init.sql" -ForegroundColor Yellow
    }
}

# ============================================================================
# PASO 5: Esperar a que los pods esten listos
# ============================================================================
Write-Host ""
Write-Host "[PASO 5/6] Esperando a que los pods esten listos..." -ForegroundColor Yellow
Write-Host "  (Esto puede tardar 2-3 minutos...)" -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 20

# Mostrar estado
kubectl get pods -n $NAMESPACE

Write-Host ""
Write-Host "Esperando 30 segundos mas para que todo inicie..." -ForegroundColor DarkGray
Start-Sleep -Seconds 30

# ============================================================================
# PASO 6: Iniciar port-forwards y abrir navegador
# ============================================================================
Write-Host ""
Write-Host "[PASO 6/6] Iniciando acceso local..." -ForegroundColor Yellow

# Frontend
Write-Host "  [*] Frontend -> http://localhost:5173" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Frontend :5173'; kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE"
Start-Sleep -Seconds 2

# API Gateway
Write-Host "  [*] API Gateway -> http://localhost:8000" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: API Gateway :8000'; kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
Start-Sleep -Seconds 2

# RabbitMQ Management
Write-Host "  [*] RabbitMQ UI -> http://localhost:15672" -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: RabbitMQ :15672'; kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE"
Start-Sleep -Seconds 2

# Keycloak (puerto 9080 para evitar conflictos, frontend espera este puerto)
Write-Host "  [*] Keycloak -> http://localhost:9080" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Keycloak :9080'; kubectl port-forward svc/keycloak 9080:8080 -n $NAMESPACE"
Start-Sleep -Seconds 2

# Notification Service (para WebSocket real-time)
Write-Host "  [*] Notifications -> http://localhost:4000" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Notifications :4000'; kubectl port-forward svc/notification-service 4000:4000 -n $NAMESPACE"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "          TICKETBUSTER CORRIENDO EN KUBERNETES!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso:" -ForegroundColor Yellow
Write-Host "  Frontend:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API:            http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Keycloak:       http://localhost:9080 (admin/admin)" -ForegroundColor Cyan
Write-Host "  Notifications:  http://localhost:4000 (WebSocket)" -ForegroundColor Cyan
Write-Host "  RabbitMQ:       http://localhost:15672 (guest/guest)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Usuarios de prueba (Keycloak):" -ForegroundColor Yellow
Write-Host "  Usuario:    estudiante / estudiante123" -ForegroundColor Cyan
Write-Host "  Admin:      admin / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Abriendo navegador..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "  Ver pods:      kubectl get pods -n $NAMESPACE"
Write-Host "  Ver logs:      kubectl logs -f deployment/order-worker -n $NAMESPACE"
Write-Host "  Ver HPA:       kubectl get hpa -n $NAMESPACE"
Write-Host "  Detener todo:  .\scripts\stop-all.ps1"
Write-Host "  Eliminar:      .\scripts\stop-all.ps1 -DeleteNamespace"
Write-Host "  Reset total:   .\scripts\stop-all.ps1 -DeleteData"
Write-Host ""
Write-Host "Presiona Ctrl+C para salir (los port-forwards seguiran corriendo)" -ForegroundColor DarkGray
Write-Host ""
