# ============================================================================
# Crear Cloudflare Tunnel Secret (Windows PowerShell)
# Uso: .\scripts\create-tunnel-secret.ps1 -Token "eyJ..."
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

$Namespace = "ticketbuster"

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "Crear Cloudflare Tunnel Secret" -ForegroundColor Cyan
    Write-Host ""
    $Token = Read-Host "Pega el token del profesor aquí"
}

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "Error: Token vacío" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creando namespace si no existe..." -ForegroundColor Yellow
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

Write-Host "Creando secret cloudflare-tunnel..." -ForegroundColor Yellow
kubectl create secret generic cloudflare-tunnel `
    --from-literal=TUNNEL_TOKEN="$Token" `
    --namespace=$Namespace `
    --dry-run=client -o yaml | kubectl apply -f -

Write-Host ""
Write-Host "Secret creado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes aplicar el tunel:" -ForegroundColor Cyan
Write-Host "  kubectl apply -f k8s/tunnel.yaml"
Write-Host ""
