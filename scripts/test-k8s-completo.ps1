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

# Limpiar despliegue anterior si existe
Write-Host "  Limpiando despliegue anterior..." -ForegroundColor DarkGray
kubectl delete namespace $NAMESPACE --ignore-not-found=true 2>&1 | Out-Null
Start-Sleep -Seconds 5

# Namespace
Write-Host "  Creando namespace..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\namespace.yaml" 2>&1 | Out-Null

# Infrastructure
Write-Host "  Desplegando PostgreSQL y RabbitMQ..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\infrastructure.yaml" 2>&1 | Out-Null
Start-Sleep -Seconds 10

# Services
Write-Host "  Desplegando microservicios..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\services-deployment.yaml" 2>&1 | Out-Null

# HPA
Write-Host "  Configurando autoscaling..." -ForegroundColor Blue
kubectl apply -f "$ROOT_DIR\k8s\hpa.yaml" 2>&1 | Out-Null

Write-Host "[OK] Kubernetes deployment aplicado" -ForegroundColor Green

# ============================================================================
# PASO 4: Esperar a que los pods esten listos
# ============================================================================
Write-Host ""
Write-Host "[PASO 4/5] Esperando a que los pods esten listos..." -ForegroundColor Yellow
Write-Host "  (Esto puede tardar 2-3 minutos...)" -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 20

# Mostrar estado
kubectl get pods -n $NAMESPACE

Write-Host ""
Write-Host "Esperando 30 segundos mas para que todo inicie..." -ForegroundColor DarkGray
Start-Sleep -Seconds 30

# ============================================================================
# PASO 5: Iniciar port-forwards y abrir navegador
# ============================================================================
Write-Host ""
Write-Host "[PASO 5/5] Iniciando acceso local..." -ForegroundColor Yellow

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

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "          TICKETBUSTER CORRIENDO EN KUBERNETES!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso:" -ForegroundColor Yellow
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API:        http://localhost:8000" -ForegroundColor Cyan
Write-Host "  RabbitMQ:   http://localhost:15672 (guest/guest)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Abriendo navegador..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "  Ver pods:    kubectl get pods -n $NAMESPACE"
Write-Host "  Ver logs:    kubectl logs -f deployment/order-worker -n $NAMESPACE"
Write-Host "  Ver HPA:     kubectl get hpa -n $NAMESPACE"
Write-Host "  Eliminar:    kubectl delete namespace $NAMESPACE"
Write-Host ""
Write-Host "Presiona Ctrl+C para salir (los port-forwards seguiran corriendo)" -ForegroundColor DarkGray
Write-Host ""
