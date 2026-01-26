# ============================================================================
# TicketBuster - Inicializar usuarios de Keycloak
# ============================================================================
# Este script crea los usuarios de prueba en Keycloak via API
# Debe ejecutarse después de que Keycloak esté listo
# ============================================================================

param(
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin",
    [string]$Realm = "ticketbuster"
)

$ErrorActionPreference = "Continue"

Write-Host "Inicializando usuarios en Keycloak..." -ForegroundColor Yellow

# Obtener token de admin
try {
    $tokenResponse = Invoke-RestMethod -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" `
        -Method Post `
        -Body @{
            grant_type = 'password'
            client_id = 'admin-cli'
            username = $AdminUser
            password = $AdminPass
        }
    $token = $tokenResponse.access_token
    Write-Host "  [OK] Token de admin obtenido" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] No se pudo obtener token de admin: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# Usuarios a crear
$users = @(
    @{
        username = "estudiante"
        email = "estudiante@ticketbuster.com"
        firstName = "Usuario"
        lastName = "Estudiante"
        password = "estudiante123"
    },
    @{
        username = "admin"
        email = "admin@ticketbuster.com"
        firstName = "Admin"
        lastName = "TicketBuster"
        password = "admin123"
    }
)

foreach ($user in $users) {
    Write-Host "  Procesando usuario: $($user.username)..." -ForegroundColor Blue
    
    # Verificar si el usuario ya existe
    $existingUsers = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$Realm/users?username=$($user.username)" `
        -Method Get -Headers $headers
    
    if ($existingUsers.Count -gt 0) {
        $userId = $existingUsers[0].id
        Write-Host "    Usuario existe (ID: $userId), reseteando password..." -ForegroundColor DarkGray
    } else {
        # Crear usuario
        $userBody = @{
            username = $user.username
            email = $user.email
            firstName = $user.firstName
            lastName = $user.lastName
            enabled = $true
            emailVerified = $true
        } | ConvertTo-Json
        
        try {
            $null = Invoke-WebRequest -Uri "$KeycloakUrl/admin/realms/$Realm/users" `
                -Method Post -Headers $headers -Body $userBody
            Write-Host "    Usuario creado" -ForegroundColor Green
        } catch {
            Write-Host "    Error creando usuario: $_" -ForegroundColor Red
            continue
        }
        
        # Obtener ID del usuario recién creado
        $existingUsers = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$Realm/users?username=$($user.username)" `
            -Method Get -Headers $headers
        $userId = $existingUsers[0].id
    }
    
    # Resetear password
    $passwordBody = @{
        type = "password"
        value = $user.password
        temporary = $false
    } | ConvertTo-Json
    
    try {
        $null = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$Realm/users/$userId/reset-password" `
            -Method Put -Headers $headers -Body $passwordBody
        Write-Host "    [OK] Password configurado" -ForegroundColor Green
    } catch {
        Write-Host "    Error configurando password: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Usuarios disponibles:" -ForegroundColor Cyan
Write-Host "  estudiante / estudiante123" -ForegroundColor White
Write-Host "  admin / admin123" -ForegroundColor White
