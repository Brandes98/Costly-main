costly-backend/
│
├── 📁 src/
│   │
│   ├── 📁 config/                         # Configuración global
│   │   ├── database.js                    # Cliente Prisma singleton
│   │   ├── redis.js                       # Cliente Redis
│   │   ├── logger.js                      # Winston logger
│   │   └── env.js                         # Validación de variables de entorno (Zod)
│   │
│   ├── 📁 middlewares/                    # Middlewares globales Express
│   │   ├── auth.middleware.js             # Verificación JWT
│   │   ├── roles.middleware.js            # Control de acceso por rol
│   │   ├── validate.middleware.js         # Validación de body/params con Zod
│   │   ├── audit.middleware.js            # Registro automático de auditoría
│   │   ├── rateLimit.middleware.js        # Rate limiting por ruta
│   │   ├── sanitize.middleware.js         # Sanitización de inputs (XSS)
│   │   └── errorHandler.middleware.js     # Manejo centralizado de errores
│   │
│   ├── 📁 modules/                        # Módulos del negocio
│   │   │
│   │   ├── 📁 auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js
│   │   │
│   │   ├── 📁 empresa/
│   │   │   ├── empresa.routes.js
│   │   │   ├── empresa.controller.js
│   │   │   ├── empresa.service.js
│   │   │   └── empresa.schema.js
│   │   │
│   │   ├── 📁 usuarios/
│   │   │   ├── usuarios.routes.js
│   │   │   ├── usuarios.controller.js
│   │   │   ├── usuarios.service.js
│   │   │   └── usuarios.schema.js
│   │   │
│   │   ├── 📁 proveedores/
│   │   │   ├── proveedores.routes.js
│   │   │   ├── proveedores.controller.js
│   │   │   ├── proveedores.service.js
│   │   │   └── proveedores.schema.js
│   │   │
│   │   ├── 📁 clientes/
│   │   │   ├── clientes.routes.js
│   │   │   ├── clientes.controller.js
│   │   │   ├── clientes.service.js
│   │   │   └── clientes.schema.js
│   │   │
│   │   ├── 📁 productos/
│   │   │   ├── productos.routes.js
│   │   │   ├── productos.controller.js
│   │   │   ├── productos.service.js
│   │   │   └── productos.schema.js
│   │   │
│   │   ├── 📁 pedidos/
│   │   │   ├── pedidos.routes.js
│   │   │   ├── pedidos.controller.js
│   │   │   ├── pedidos.service.js
│   │   │   └── pedidos.schema.js
│   │   │
│   │   ├── 📁 importaciones/
│   │   │   ├── importaciones.routes.js
│   │   │   ├── importaciones.controller.js
│   │   │   ├── importaciones.service.js
│   │   │   └── importaciones.schema.js
│   │   │
│   │   ├── 📁 lineas-pedido/
│   │   │   ├── lineas.routes.js
│   │   │   ├── lineas.controller.js
│   │   │   ├── lineas.service.js
│   │   │   └── lineas.schema.js
│   │   │
│   │   ├── 📁 costeos/
│   │   │   ├── costeos.routes.js
│   │   │   ├── costeos.controller.js
│   │   │   ├── costeos.service.js
│   │   │   └── costeos.schema.js
│   │   │
│   │   ├── 📁 pagos/
│   │   │   ├── pagos.routes.js
│   │   │   ├── pagos.controller.js
│   │   │   ├── pagos.service.js
│   │   │   └── pagos.schema.js
│   │   │
│   │   ├── 📁 hitos/
│   │   │   ├── hitos.routes.js
│   │   │   ├── hitos.controller.js
│   │   │   ├── hitos.service.js
│   │   │   └── hitos.schema.js
│   │   │
│   │   ├── 📁 contenedores/
│   │   │   ├── contenedores.routes.js
│   │   │   ├── contenedores.controller.js
│   │   │   ├── contenedores.service.js
│   │   │   └── contenedores.schema.js
│   │   │
│   │   ├── 📁 tramite-aduana/
│   │   │   ├── tramite.routes.js
│   │   │   ├── tramite.controller.js
│   │   │   ├── tramite.service.js
│   │   │   └── tramite.schema.js
│   │   │
│   │   ├── 📁 tc-historico/
│   │   │   ├── tc.routes.js
│   │   │   ├── tc.controller.js
│   │   │   ├── tc.service.js
│   │   │   └── tc.schema.js
│   │   │
│   │   ├── 📁 documentos/
│   │   │   ├── documentos.routes.js
│   │   │   ├── documentos.controller.js
│   │   │   ├── documentos.service.js
│   │   │   └── documentos.schema.js
│   │   │
│   │   ├── 📁 permisos/
│   │   │   ├── permisos.routes.js
│   │   │   ├── permisos.controller.js
│   │   │   ├── permisos.service.js
│   │   │   └── permisos.schema.js
│   │   │
│   │   ├── 📁 proyeccion/
│   │   │   ├── proyeccion.routes.js
│   │   │   ├── proyeccion.controller.js
│   │   │   ├── proyeccion.service.js
│   │   │   └── proyeccion.schema.js
│   │   │
│   │   ├── 📁 reportes/
│   │   │   ├── reportes.routes.js
│   │   │   ├── reportes.controller.js
│   │   │   ├── reportes.service.js
│   │   │   └── reportes.schema.js
│   │   │
│   │   └── 📁 auditoria/
│   │       ├── auditoria.routes.js
│   │       ├── auditoria.controller.js
│   │       └── auditoria.service.js
│   │
│   ├── 📁 utils/                          # Utilidades reutilizables
│   │   ├── costeo.utils.js                # Cálculos CIF, pesos, márgenes
│   │   ├── proyeccion.utils.js            # Cálculo de pallets y contenedores
│   │   ├── moneda.utils.js                # Conversión de monedas
│   │   ├── pagination.utils.js            # Helpers de paginación
│   │   ├── response.utils.js              # Formato estándar de respuestas API
│   │   ├── fecha.utils.js                 # Cálculo de deadlines y fechas
│   │   └── codigo.utils.js                # Generación de códigos PED-, IMP-
│   │
│   └── app.js                             # Express app (sin listen)
│
├── 📁 prisma/
│   ├── schema.prisma                      # Schema completo (24 tablas)
│   ├── 📁 migrations/                     # Migraciones auto-generadas
│   └── seed.js                            # Datos iniciales
│
├── 📁 tests/                              # Pruebas
│   ├── 📁 unit/                           # Pruebas unitarias por módulo
│   │   ├── costeo.utils.test.js
│   │   └── proyeccion.utils.test.js
│   └── 📁 integration/                    # Pruebas de integración
│       ├── auth.test.js
│       └── pedidos.test.js
│
├── 📁 logs/                               # Logs generados (gitignored)
│   ├── error.log
│   └── combined.log
│
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── package.json
└── server.js                              # Entry point
