# SEGURIDAD — Costly API · Vadibarot Ltda.
# Checklist completo para producción

## ✅ IMPLEMENTADO EN EL CÓDIGO BASE

### Autenticación y Autorización
- [x] JWT con expiración (8h)
- [x] Verificación de usuario activo en cada request
- [x] Control de acceso por rol en cada ruta
- [x] Contraseñas hasheadas con bcrypt (nunca en texto plano)

### HTTP Security (Helmet)
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY (clickjacking)
- [x] Content-Security-Policy
- [x] X-XSS-Protection
- [x] HSTS (solo HTTPS en producción)

### Rate Limiting
- [x] Global: 100 req/min por IP
- [x] Login: 10 intentos / 15 min (protección brute force)

### Validación y Sanitización
- [x] Validación de inputs con Zod en cada endpoint
- [x] Sanitización de XSS en body, params y query
- [x] Límite de tamaño de body (10mb)

### CORS
- [x] Solo orígenes permitidos (lista blanca)
- [x] Métodos HTTP restringidos

### Errores
- [x] Nunca exponer stack traces en producción
- [x] Códigos de error internos (no mensajes del sistema)
- [x] Manejo de errores de Prisma (P2025, P2002)

### Auditoría
- [x] Registro de INSERT, UPDATE, DELETE, LOGIN, EXPORT
- [x] Quién, cuándo, qué campo, valor antes y después
- [x] Registro inmutable (solo admin puede leer, nadie borra)

---

## 🔧 CONFIGURAR ANTES DE IR A PRODUCCIÓN

### Variables de entorno (.env producción)
```env
# Base de datos — usar usuario con permisos mínimos
DATABASE_URL="postgresql://costly_app:PASSWORD_FUERTE@host:5432/costly_db?schema=public&sslmode=require"

# JWT — mínimo 64 caracteres aleatorios
JWT_SECRET="genera-uno-con-node-crypto-randomBytes-64"
JWT_EXPIRES_IN="8h"

# Redis con contraseña
REDIS_URL="redis://:PASSWORD_REDIS@host:6379"

# CORS — solo tu dominio de producción
ALLOWED_ORIGINS="https://costly.vadibarot.com"

# Ambiente
NODE_ENV="production"
PORT=3000

# BCCR
BCCR_EMAIL="finanzas@vadibarot.com"
BCCR_TOKEN="tu_token_bccr"
```

### Generar JWT_SECRET seguro
```powershell
# En PowerShell o Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 INFRAESTRUCTURA DE PRODUCCIÓN

### Base de datos PostgreSQL
- [ ] Usuario de DB con permisos mínimos (SELECT, INSERT, UPDATE, DELETE — NO DROP)
- [ ] Conexión SSL obligatoria (`sslmode=require`)
- [ ] Backups automáticos diarios
- [ ] PostgreSQL en servidor separado del backend
- [ ] Pool de conexiones configurado (máx 10 conexiones)

### Servidor
- [ ] HTTPS obligatorio (certificado SSL/TLS — Let's Encrypt es gratis)
- [ ] Reverse proxy con Nginx
- [ ] PM2 para mantener el proceso Node.js activo
- [ ] Firewall: solo puertos 80, 443 y 22 abiertos
- [ ] Puerto 3000 (Node) NO expuesto directamente a internet

### Configuración Nginx básica
```nginx
server {
    listen 443 ssl;
    server_name costly.vadibarot.com;

    ssl_certificate /etc/letsencrypt/live/costly.vadibarot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/costly.vadibarot.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name costly.vadibarot.com;
    return 301 https://$host$request_uri;
}
```

### PM2 (proceso Node.js en producción)
```bash
npm install -g pm2

# Iniciar
pm2 start server.js --name "costly-api" --instances 2

# Ver logs
pm2 logs costly-api

# Auto-restart al reiniciar el servidor
pm2 startup
pm2 save
```

---

## 🔒 SEGURIDAD DE DATOS SENSIBLES

### Datos que NUNCA deben aparecer en logs ni responses
- Passwords (ni hashed)
- JWT secrets
- Tokens de API (BCCR, etc.)
- Números de cuenta bancaria completos
- Datos de tarjetas

### Campos a excluir en queries de Prisma
```javascript
// Siempre excluir password_hash en selects de usuario
const usuario = await prisma.usuario.findUnique({
  where: { usuario_id: id },
  select: {
    usuario_id: true,
    nombre: true,
    email: true,
    rol: true,
    activo: true,
    // password_hash: false  ← NUNCA incluir esto
  }
})
```

---

## 📋 CHECKLIST FINAL ANTES DE PRODUCCIÓN

### Código
- [ ] NODE_ENV=production en servidor
- [ ] Todos los console.log reemplazados por logger
- [ ] No hay credenciales hardcodeadas en el código
- [ ] .env NO subido a Git (.gitignore correcto)
- [ ] Dependencias actualizadas (`npm audit`)

### Base de datos
- [ ] Migraciones corridas en producción
- [ ] Seed ejecutado (empresa, usuario admin inicial)
- [ ] Backups verificados y restaurables
- [ ] Índices creados en campos de búsqueda frecuente

### Infraestructura
- [ ] HTTPS funcionando
- [ ] Certificado SSL válido
- [ ] Rate limiting verificado
- [ ] Logs centralizados
- [ ] Alertas de errores configuradas

### Acceso
- [ ] Usuario admin inicial creado con contraseña fuerte
- [ ] Acceso SSH solo por llave (no contraseña)
- [ ] Credenciales de DB cambiadas (no usar las de desarrollo)
- [ ] Panel de Prisma Studio CERRADO en producción

---

## 🔍 ÍNDICES RECOMENDADOS EN LA BD

Agregar al final del schema.prisma para mejorar performance:

```prisma
model pedido {
  // ...campos...
  @@index([empresa_id, estado])
  @@index([empresa_id, proveedor_id])
  @@index([importacion_id])
  @@index([codigo_padre])
}

model hito {
  // ...campos...
  @@index([pedido_id, estado])
  @@index([fecha_plan])
}

model auditoria {
  // ...campos...
  @@index([empresa_id, entidad_tipo])
  @@index([usuario_id])
  @@index([creado_en])
}

model tc_historico {
  // ...campos...
  @@index([empresa_id, fecha])
}
```
