# ============================================================================
# TicketBuster - Kubernetes Local Deployment (Windows PowerShell)
# Despliega en K8s y configura port-forward para acceso local (Sin Tunel)
# ============================================================================

$ErrorActionPreference = "Continue"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
$K8S_DIR = "$ROOT_DIR\k8s"
$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         TicketBuster - K8s Local Deployment" -ForegroundColor Cyan
Write-Host "         (Sin tunel - Acceso via port-forward)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Pre-flight checks
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "Error: kubectl no encontrado" -ForegroundColor Red
    exit 1
}

$clusterInfo = kubectl cluster-info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: No se puede conectar al cluster K8s" -ForegroundColor Red
    Write-Host "Verifica que Docker Desktop/Minikube este corriendo" -ForegroundColor Yellow
    exit 1
}

# 1. Namespace
Write-Host "[INFO] Creando namespace..." -ForegroundColor Blue
kubectl apply -f "$K8S_DIR\namespace.yaml"
Write-Host "[OK] Namespace creado" -ForegroundColor Green

# 2. Infrastructure
Write-Host ""
Write-Host "[INFO] Desplegando infraestructura (PostgreSQL + RabbitMQ)..." -ForegroundColor Blue
kubectl apply -f "$K8S_DIR\infrastructure.yaml"
Write-Host "[OK] Infraestructura aplicada" -ForegroundColor Green

Write-Host "[INFO] Esperando a que PostgreSQL este listo..." -ForegroundColor Blue
$null = kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] PostgreSQL aun esta iniciando (continuando de todos modos)..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] PostgreSQL listo" -ForegroundColor Green
}

Write-Host "[INFO] Esperando a que RabbitMQ este listo..." -ForegroundColor Blue
$null = kubectl wait --for=condition=ready pod -l app=rabbitmq -n $NAMESPACE --timeout=60s 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] RabbitMQ aun esta iniciando (continuando de todos modos)..." -ForegroundColor Yellow
    Write-Host "    RabbitMQ tarda ~2 minutos en iniciar completamente" -ForegroundColor DarkGray
} else {
    Write-Host "[OK] RabbitMQ listo" -ForegroundColor Green
}

# 3. Services
Write-Host ""
Write-Host "[INFO] Desplegando microservicios..." -ForegroundColor Blue
kubectl apply -f "$K8S_DIR\services-deployment.yaml"
Write-Host "[OK] Microservicios aplicados" -ForegroundColor Green

# 4. HPA
Write-Host ""
Write-Host "[INFO] Aplicando Horizontal Pod Autoscalers..." -ForegroundColor Blue
kubectl apply -f "$K8S_DIR\hpa.yaml"
Write-Host "[OK] HPA configurado" -ForegroundColor Green

# 5. Wait for services
Write-Host ""
Write-Host "[INFO] Esperando a que los servicios esten listos..." -ForegroundColor Blue
Start-Sleep -Seconds 5
kubectl wait --for=condition=ready pod -l tier=backend -n $NAMESPACE --timeout=180s 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Algunos pods pueden estar iniciando..." -ForegroundColor Yellow
}

kubectl wait --for=condition=ready pod -l tier=frontend -n $NAMESPACE --timeout=120s 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Frontend puede estar iniciando..." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "              Deployment Completado!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Estado de Pods:" -ForegroundColor Yellow
kubectl get pods -n $NAMESPACE
Write-Host ""

Write-Host "Para acceder localmente, abre 2 terminales nuevas:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  # Terminal 1 - Frontend" -ForegroundColor Cyan
Write-Host "  kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE"
Write-Host ""
Write-Host "  # Terminal 2 - API Gateway" -ForegroundColor Cyan
Write-Host "  kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
Write-Host ""
Write-Host "  # Terminal 3 - RabbitMQ Management (opcional)" -ForegroundColor DarkGray
Write-Host "  kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE"
Write-Host ""
Write-Host "Luego abre: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "  Ver logs:      kubectl logs -f deployment/order-worker -n $NAMESPACE"
Write-Host "  Ver HPA:       kubectl get hpa -n $NAMESPACE"
Write-Host "  Escalar:       kubectl scale deployment/api-gateway --replicas=3 -n $NAMESPACE"
Write-Host "  Eliminar todo: kubectl delete namespace $NAMESPACE"
Write-Host ""
