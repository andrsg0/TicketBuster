# TicketBuster - Lista de Pendientes (TO-DO)

> Última actualización: Enero 2026

## 🔐 Autenticación y Usuarios

- [x] **Login con Keycloak** - Integrar autenticación real con Keycloak
  - [x] Configurar Keycloak en K8s
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

## 📱 Frontend / UX

- [x] **Mejorar selección de asientos**
  - [x] Colores por precio/sección
  - [x] Leyenda de estados

- [x] **Búsqueda y filtros**
  - [x] Barra de búsqueda por nombre de evento
  - [x] Filtros por categoría, fecha, precio
  - [x] Ordenar por fecha, precio, popularidad

---

## 🎫 Tickets y QR

- [ ] **Generar QR codes**
  - [x] QR único por cada ticket
  - [ ] Incluir hash de verificación
  - [ ] Almacenar en BD y mostrar en frontend

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
  - [ ] Solicitar permiso de notificaciones

- [ ] **Tipos de notificaciones**
  - [ ] Orden confirmada
  - [ ] Orden fallida
  - [ ] Asiento liberado (para waitlist)
  - [ ] Recordatorio de evento

---

## 📚 Documentación

- [ ] **API Documentation**
  - [ ] Swagger/OpenAPI para cada servicio
  - [ ] Ejemplos de requests/responses

- [ ] **Arquitectura**
  - [ ] Diagrama de arquitectura actualizado
  - [ ] Diagrama de secuencia para flujos principales

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
