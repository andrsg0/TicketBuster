# ============================================================================
# Helper: Inicia port-forwards en background para acceso local
# ============================================================================

$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "Iniciando port-forwards en background..." -ForegroundColor Cyan
Write-Host ""

# Frontend
Write-Host "[*] Frontend -> http://localhost:5173" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE"
Start-Sleep -Seconds 1

# API Gateway
Write-Host "[*] API Gateway -> http://localhost:8000" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
Start-Sleep -Seconds 1

# RabbitMQ Management (opcional)
Write-Host "[*] RabbitMQ UI -> http://localhost:15672" -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Port-forwards activos!" -ForegroundColor Green
Write-Host "  Abre: http://localhost:5173" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para detener: Cierra las ventanas de PowerShell" -ForegroundColor Yellow
Write-Host ""
