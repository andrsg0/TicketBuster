# TicketBuster - Lista de Pendientes (TO-DO)

> Última actualización: Enero 2026

## 🔐 Autenticación y Usuarios

- [x] **Login con Keycloak** - Integrar autenticación real con Keycloak
  - [ ] Configurar Keycloak en K8s
  - [x] Crear realm `ticketbuster`
  - [x] Configurar cliente para frontend (SPA)
  - [x] Implementar flujo OAuth2/OIDC en frontend
  - [x] Validar JWT real en API Gateway (quitar DEV_MODE)

- [ ] **Cambiar de usuario** - Permitir logout y login con otro usuario
  - [ ] Botón de logout en frontend
  - [ ] Limpiar tokens y estado local
  - [ ] Redirigir a página de login

- [ ] **Registro de usuarios** - Permitir crear cuentas nuevas
  - [ ] Formulario de registro en frontend
  - [ ] Endpoint de registro en Keycloak
  - [ ] Validación de email

- [ ] **Perfil de usuario** - Ver y editar datos personales
  - [ ] Página de perfil
  - [ ] Editar nombre, email, teléfono
  - [ ] Cambiar contraseña

---

## 🛒 Carrito de Compras

- [x] **Implementar carrito persistente**
  - [x] Almacenar carrito en localStorage (offline-first)
  - [x] Sincronizar carrito con backend cuando hay conexión
  - [x] Mostrar contador de items en header

- [x] **Página de carrito**
  - [x] Listar asientos seleccionados
  - [x] Mostrar precio por asiento y total
  - [x] Botón para eliminar items
  - [x] Botón para vaciar carrito

- [x] **Reserva temporal de asientos**
  - [x] Lock de asientos por X minutos mientras están en carrito
  - [x] Timer visible mostrando tiempo restante
  - [x] Auto-liberar asientos si expira el tiempo

- [x] **Checkout multi-evento**
  - [x] Permitir comprar asientos de diferentes eventos en una sola orden
  - [x] Agrupar tickets por evento en confirmación

---

## 💳 Pagos

- [ ] **Integrar pasarela de pagos**
  - [ ] Integrar Stripe/PayPal/MercadoPago
  - [ ] Formulario de pago seguro
  - [ ] Webhooks para confirmación de pago

- [ ] **Facturación**
  - [ ] Generar factura/boleta PDF
  - [ ] Enviar por email
  - [ ] Historial de facturas

---

## 📱 Frontend / UX

- [ ] **Mejorar selección de asientos**
  - [ ] Mapa visual del venue (SVG interactivo)
  - [ ] Zoom y pan en el mapa
  - [ ] Colores por precio/sección
  - [ ] Leyenda de estados

- [ ] **Búsqueda y filtros**
  - [ ] Barra de búsqueda por nombre de evento
  - [ ] Filtros por categoría, fecha, precio
  - [ ] Ordenar por fecha, precio, popularidad

- [ ] **Favoritos**
  - [ ] Guardar eventos favoritos
  - [ ] Notificar cuando hay nuevos asientos disponibles

- [ ] **Historial de compras**
  - [ ] Ver todas las órdenes pasadas
  - [ ] Descargar tickets anteriores
  - [ ] Ver estado de cada orden

- [ ] **Notificaciones push**
  - [ ] Solicitar permiso de notificaciones
  - [ ] Notificar confirmación de compra
  - [ ] Notificar recordatorio antes del evento

---

## 🎫 Tickets y QR

- [ ] **Generar QR codes**
  - [ ] QR único por cada ticket
  - [ ] Incluir hash de verificación
  - [ ] Almacenar en BD y mostrar en frontend

- [ ] **Wallet digital**
  - [ ] Agregar ticket a Apple Wallet
  - [ ] Agregar ticket a Google Pay

- [ ] **Validación de tickets**
  - [ ] App/página para escanear QR en entrada
  - [ ] Marcar ticket como usado
  - [ ] Prevenir uso duplicado

---

## 📊 Pruebas de Carga

- [ ] **Configurar herramientas de load testing**
  - [ ] Instalar k6 o Locust
  - [ ] Crear scripts de prueba

- [ ] **Escenarios de prueba**
  - [ ] Test de carga gradual (ramp-up)
  - [ ] Test de pico (spike test)
  - [ ] Test de estrés (stress test)
  - [ ] Test de resistencia (soak test)

- [ ] **Métricas a medir**
  - [ ] Tiempo de respuesta (p50, p95, p99)
  - [ ] Throughput (requests/segundo)
  - [ ] Tasa de errores
  - [ ] Uso de CPU/memoria por pod

- [ ] **Probar HPA (Horizontal Pod Autoscaler)**
  - [ ] Verificar que escala automáticamente
  - [ ] Ajustar thresholds de CPU/memoria
  - [ ] Medir tiempo de scale-up

- [ ] **Prueba de concurrencia en asientos**
  - [ ] Simular 100+ usuarios comprando el mismo asiento
  - [ ] Verificar que solo 1 gana
  - [ ] Verificar que los demás reciben error claro

---

## 🔔 Notificaciones en Tiempo Real

- [ ] **WebSockets**
  - [ ] Conectar frontend a notification-service
  - [ ] Mostrar notificaciones en UI
  - [ ] Reconexión automática

- [ ] **Tipos de notificaciones**
  - [ ] Orden confirmada
  - [ ] Orden fallida
  - [ ] Asiento liberado (para waitlist)
  - [ ] Recordatorio de evento

---

## 🏗️ Infraestructura y DevOps

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions para build automático
  - [ ] Tests automáticos en PR
  - [ ] Deploy automático a staging
  - [ ] Deploy manual a producción

- [ ] **Monitoreo**
  - [ ] Instalar Prometheus + Grafana
  - [ ] Dashboards de métricas
  - [ ] Alertas por Slack/email

- [ ] **Logging centralizado**
  - [ ] ELK Stack o Loki
  - [ ] Búsqueda de logs
  - [ ] Correlación de requests

- [ ] **Secrets management**
  - [ ] Usar Kubernetes Secrets encriptados
  - [ ] O integrar con Vault/AWS Secrets Manager

---

## 🧪 Testing

- [ ] **Unit tests**
  - [ ] Tests para cada microservicio
  - [ ] Cobertura mínima 80%

- [ ] **Integration tests**
  - [ ] Tests de API end-to-end
  - [ ] Tests de flujos completos

- [ ] **E2E tests**
  - [ ] Cypress o Playwright para frontend
  - [ ] Flujo completo de compra

---

## 📚 Documentación

- [ ] **API Documentation**
  - [ ] Swagger/OpenAPI para cada servicio
  - [ ] Ejemplos de requests/responses

- [ ] **Arquitectura**
  - [ ] Diagrama de arquitectura actualizado
  - [ ] Diagrama de secuencia para flujos principales

- [ ] **Guía de contribución**
  - [ ] Cómo configurar entorno de desarrollo
  - [ ] Estándares de código
  - [ ] Proceso de PR

---

## 🐛 Bugs Conocidos

- [x] ~~API Gateway no conecta a RabbitMQ al inicio~~ (FIXED)
- [x] ~~Falta columna qr_code_base64 en orders~~ (FIXED)
- [x] ~~Frontend usa localhost en vez de service name~~ (FIXED)
- [x] ~~Variables POSTGRES_* faltantes en deployment~~ (FIXED)
- [ ] Eventos duplicados si se ejecuta init.sql múltiples veces

---

## 🚀 Prioridad Alta (Próximos pasos recomendados)

1. **Login con Keycloak** - Fundamental para identificar usuarios reales
2. **Carrito de compras** - Mejorar UX de selección múltiple
3. **Pruebas de carga** - Validar que el sistema escala
4. **QR codes funcionales** - Completar el flujo de tickets

---

## 📝 Notas

- El sistema actualmente usa `DEV_MODE=true` que bypasea la validación JWT
- El usuario hardcodeado es `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Los asientos se lockean por 10 minutos automáticamente
- El HPA está configurado para escalar entre 2-10 réplicas

---

**¿Quieres empezar con alguna de estas tareas? Marca con [x] las que completes.**
