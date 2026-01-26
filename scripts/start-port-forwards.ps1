# ============================================================================
# Helper: Inicia port-forwards en background para acceso local
# ============================================================================

$NAMESPACE = "ticketbuster"

Write-Host ""
Write-Host "Iniciando port-forwards en background..." -ForegroundColor Cyan
Write-Host ""

# Frontend
Write-Host "[*] Frontend -> http://localhost:5173" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Frontend :5173'; kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE"
Start-Sleep -Seconds 1

# API Gateway
Write-Host "[*] API Gateway -> http://localhost:8000" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: API Gateway :8000'; kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
Start-Sleep -Seconds 1

# Keycloak (puerto 9080)
Write-Host "[*] Keycloak -> http://localhost:9080" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Keycloak :9080'; kubectl port-forward svc/keycloak 9080:8080 -n $NAMESPACE"
Start-Sleep -Seconds 1

# Notification Service (WebSocket)
Write-Host "[*] Notifications -> http://localhost:4000" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: Notifications :4000'; kubectl port-forward svc/notification-service 4000:4000 -n $NAMESPACE"
Start-Sleep -Seconds 1

# RabbitMQ Management (opcional)
Write-Host "[*] RabbitMQ UI -> http://localhost:15672" -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='K8s Port-Forward: RabbitMQ :15672'; kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Port-forwards activos!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso:" -ForegroundColor Yellow
Write-Host "  Frontend:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API:            http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Keycloak:       http://localhost:9080" -ForegroundColor Cyan
Write-Host "  Notifications:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "  RabbitMQ:       http://localhost:15672" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Para detener: .\scripts\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""
