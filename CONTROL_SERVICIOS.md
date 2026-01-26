# TicketBuster - Referencia Rápida de Control de Servicios

## 📋 Cheatsheet para Detener/Reiniciar

### ❌ NO RECOMENDADO: Borrar en Docker Desktop
```
Docker Desktop → Clic derecho en k8s_postgres_XXXXX → Delete
❌ Resultado: Se recrea automáticamente
```
Kubernetes detecta que falta un pod y lo recrea. **No funciona.**

---

## ✅ FORMAS CORRECTAS DE DETENER

### Opción 1: Detener TODO (mantiene datos)
```powershell
.\scripts\full-stop.ps1
```
- ✅ Pausa completamente Kubernetes
- ✅ Mantiene todos tus datos
- ✅ Los containers NO se recrean

**Cuándo usar:** Para pausar sin perder datos

---

### Opción 2: Limpiar TODO (borra datos)
```powershell
.\scripts\full-cleanup.ps1
```
- ❌ Borra TODO incluyendo volúmenes
- ❌ PIERDES tickets y eventos
- ✅ Para reinicio total desde cero

**Cuándo usar:** Para empezar de cero

---

### Opción 3: Parar servicios con script existente
```powershell
.\scripts\dev-down.sh
.\scripts\dev-up.sh
```
- ✅ Pausa los servicios
- ✅ Mantiene datos
- ✅ Rápido de reiniciar

---

## 🔄 CICLOS DE TRABAJO

### Ciclo 1: Desarrollo rápido
```powershell
# Arrancar
.\scripts\test-k8s-completo.ps1

# Hacer cambios en código

# Reconstruir solo una imagen (más rápido)
docker build -t ticketbuster/frontend:latest ./frontend

# Reiniciar ese servicio
kubectl rollout restart deployment/frontend -n ticketbuster

# Ver cambios en http://localhost:5173
```

### Ciclo 2: Parar para terminar sesión
```powershell
# Parar todo completamente
.\scripts\full-stop.ps1

# Después: reiniciar si quieres volver a trabajar
.\scripts\dev-up.sh
.\scripts\start-port-forwards.ps1
```

### Ciclo 3: Limpiar y empezar de nuevo
```powershell
# Limpiar todo
.\scripts\full-cleanup.ps1

# Esperar confirmación (debe decir "si")

# Reiniciar desde cero
.\scripts\test-k8s-completo.ps1
```

---

## 🔍 VERIFICACIÓN

### Ver qué hay corriendo:
```powershell
# Ver todos los pods
kubectl get pods -n ticketbuster

# Ver deployments
kubectl get deployments -n ticketbuster

# Ver servicios
kubectl get svc -n ticketbuster
```

### Ver qué está en Docker Desktop:
```powershell
# Todos los contenedores
docker ps -a

# Todos los volúmenes
docker volume ls

# Detalles de un volumen
docker volume inspect xxxxx_postgres-pvc
```

---

## ⚠️ LO QUE NO DEBES HACER

### ❌ Borrar contenedores en Docker
```
Docker Desktop → Delete
→ Se recrean automáticamente
→ Usa los scripts en su lugar
```

### ❌ Borrar namespace sin querer
```powershell
# PELIGRO: Esto borra TODO incluyendo datos
kubectl delete namespace ticketbuster
```

### ❌ Borrar volúmenes sin querer
```powershell
# PELIGRO: Esto borra tus datos
kubectl delete pvc postgres-pvc -n ticketbuster
docker volume rm xxxxx_postgres-pvc
```

---

## 📊 TABLA DE REFERENCIA

| Acción | Comando | Datos | Tiempo |
|--------|---------|-------|--------|
| Parar todo (mantener datos) | `full-stop.ps1` | ✅ | < 30s |
| Limpiar todo (perder datos) | `full-cleanup.ps1` | ❌ | < 1m |
| Parar con script | `dev-down.sh` | ✅ | < 20s |
| Reiniciar servicios | `dev-up.sh` | ✅ | < 1m |
| Reinicio completo | `test-k8s-completo.ps1` | ✅ | 3-5m |
| Borrar contenedor (NO funciona) | Docker Desktop | ✅ | Se recrea |

---

## 🎯 RESPUESTAS RÁPIDAS

**P: ¿Cómo dejo de ver los contenedores que se recrean?**
R: Ejecuta `.\scripts\full-stop.ps1` para detener Kubernetes completamente.

**P: ¿Pierdo datos si cierro Docker Desktop?**
R: No. Los volúmenes persisten. Al reiniciar Docker, tus datos siguen ahí.

**P: ¿Cómo empiezo totalmente de cero?**
R: Ejecuta `.\scripts\full-cleanup.ps1` y luego `.\scripts\test-k8s-completo.ps1`

**P: ¿Por qué se recrean los contenedores?**
R: Kubernetes mantiene los pods en ejecución. Para detenerlo, usa los scripts de stop.

**P: ¿Dónde están guardados realmente mis datos?**
R: En `/var/lib/postgresql/data` dentro del contenedor, que mapea al volumen persistente `postgres-pvc`.

---

## 🚀 REFERENCIA RÁPIDA

```powershell
# Parar todo inmediatamente
.\scripts\full-stop.ps1

# Limpiar y empezar de cero
.\scripts\full-cleanup.ps1 + .\scripts\test-k8s-completo.ps1

# Ver qué hay corriendo
kubectl get pods -n ticketbuster

# Ver logs de un servicio
kubectl logs -f deployment/api-gateway -n ticketbuster

# Entrar a la BD
kubectl exec -it deployment/postgres -n ticketbuster -- psql -U admin -d ticketbuster
```

---

**Última actualización:** Enero 2026
**Versión:** 1.0.0
