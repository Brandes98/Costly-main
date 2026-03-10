# Costly Backend — Instrucciones de instalación

## Estructura de archivos a crear

Copiar cada archivo en su carpeta correspondiente dentro de `costly-backend/`:

```
costly-backend/
├── server.js                                        ← server.js
├── package.json                                     ← package.json
├── .env.example                                     ← .env.example
├── .gitignore                                       ← .gitignore
│
├── src/
│   ├── app.js                                       ← src/app.js
│   │
│   ├── config/
│   │   ├── database.js                              ← src/config/database.js
│   │   ├── logger.js                                ← src/config/logger.js
│   │   ├── redis.js                                 ← src/config/redis.js
│   │   └── env.js                                   ← src/config/env.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js                       ← src/middlewares/auth.middleware.js
│   │   ├── roles.middleware.js                      ← src/middlewares/roles.middleware.js
│   │   ├── validate.middleware.js                   ← src/middlewares/validate.middleware.js
│   │   ├── rateLimit.middleware.js                  ← src/middlewares/rateLimit.middleware.js
│   │   ├── sanitize.middleware.js                   ← src/middlewares/sanitize.middleware.js
│   │   ├── audit.middleware.js                      ← src/middlewares/audit.middleware.js
│   │   └── errorHandler.middleware.js               ← src/middlewares/errorHandler.middleware.js
│   │
│   ├── utils/
│   │   ├── response.utils.js                        ← src/utils/response.utils.js
│   │   ├── codigo.utils.js                          ← src/utils/codigo.utils.js
│   │   ├── pagination.utils.js                      ← src/utils/pagination.utils.js
│   │   ├── fecha.utils.js                           ← src/utils/fecha.utils.js
│   │   ├── moneda.utils.js                          ← src/utils/moneda.utils.js
│   │   ├── proyeccion.utils.js                      ← src/utils/proyeccion.utils.js
│   │   └── costeo.utils.js                          ← src/utils/costeo.utils.js
│   │
│   └── modules/
│       └── auth/
│           ├── auth.routes.js                       ← copiar del archivo auth.all.js
│           ├── auth.controller.js                   ← copiar del archivo auth.all.js
│           ├── auth.service.js                      ← copiar del archivo auth.all.js
│           └── auth.schema.js                       ← copiar del archivo auth.all.js
│
└── prisma/
    └── seed.js                                      ← prisma/seed.js
```

---

## Pasos para levantar el proyecto

### 1. Verificar que Docker esté corriendo
```powershell
docker ps
```
Deben aparecer los contenedores de PostgreSQL y Redis.

### 2. Crear carpetas necesarias
```powershell
mkdir src\config
mkdir src\middlewares
mkdir src\utils
mkdir src\modules\auth
mkdir logs
```

### 3. Copiar todos los archivos en sus carpetas

### 4. Separar el archivo auth.all.js en 4 archivos
El archivo `auth.all.js` contiene los 4 archivos del módulo auth separados por comentarios.
Crear los archivos individuales copiando cada sección:
- `auth.routes.js`
- `auth.controller.js`
- `auth.service.js`
- `auth.schema.js`

### 5. Correr el seed (datos iniciales)
```powershell
node prisma/seed.js
```

### 6. Levantar el servidor
```powershell
npm run dev
```

### 7. Verificar que funciona
```powershell
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@vadibarot.com","password":"Admin1234!"}'
```

---

## Credenciales iniciales
- **Email:** admin@vadibarot.com
- **Password:** Admin1234!
- ⚠️ Cambiar la contraseña después del primer login
