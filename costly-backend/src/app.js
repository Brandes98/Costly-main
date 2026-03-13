import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { globalRateLimit } from "./middlewares/rateLimit.middleware.js";
import { sanitize } from "./middlewares/sanitize.middleware.js";

// ── Rutas (descomentar conforme se vayan creando)
import authRoutes from "./modules/auth/auth.routes.js";
// import usuariosRoutes from './modules/usuarios/usuarios.routes.js'
// import proveedoresRoutes from './modules/proveedores/proveedores.routes.js'
// import clientesRoutes from './modules/clientes/clientes.routes.js'
import productosRoutes from './modules/productos/productos.routes.js'
// import pedidosRoutes from './modules/pedidos/pedidos.routes.js'
// import importacionesRoutes from './modules/importaciones/importaciones.routes.js'
// import costeosRoutes from './modules/costeos/costeos.routes.js'
// import pagosRoutes from './modules/pagos/pagos.routes.js'
// import hitosRoutes from './modules/hitos/hitos.routes.js'
// import contenedoresRoutes from './modules/contenedores/contenedores.routes.js'
// import tramiteRoutes from './modules/tramite-aduana/tramite.routes.js'
// import tcRoutes from './modules/tc-historico/tc.routes.js'
// import documentosRoutes from './modules/documentos/documentos.routes.js'
// import permisosRoutes from './modules/permisos/permisos.routes.js'
// import proyeccionRoutes from './modules/proyeccion/proyeccion.routes.js'
// import reportesRoutes from './modules/reportes/reportes.routes.js'
// import auditoriaRoutes from './modules/auditoria/auditoria.routes.js'

const app = express();

// ── Seguridad HTTP
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }),
);

// ── CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);

// ── Rate limiting global
app.use(globalRateLimit);

// ── Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Sanitización XSS
app.use(sanitize);

// ── Compresión
app.use(compression());

// ── Logs HTTP
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// ── Health check (sin auth)
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Rutas API
const API = "/api/v1";
app.use(`${API}/auth`, authRoutes);
// app.use(`${API}/usuarios`,       usuariosRoutes)
// app.use(`${API}/proveedores`,    proveedoresRoutes)
// app.use(`${API}/clientes`,       clientesRoutes)
app.use(`${API}/productos`, productosRoutes);
// app.use(`${API}/pedidos`,        pedidosRoutes)
// app.use(`${API}/importaciones`,  importacionesRoutes)
// app.use(`${API}/costeos`,        costeosRoutes)
// app.use(`${API}/pagos`,          pagosRoutes)
// app.use(`${API}/hitos`,          hitosRoutes)
// app.use(`${API}/contenedores`,   contenedoresRoutes)
// app.use(`${API}/tramite-aduana`, tramiteRoutes)
// app.use(`${API}/tc`,             tcRoutes)
// app.use(`${API}/documentos`,     documentosRoutes)
// app.use(`${API}/permisos`,       permisosRoutes)
// app.use(`${API}/proyeccion`,     proyeccionRoutes)
// app.use(`${API}/reportes`,       reportesRoutes)
// app.use(`${API}/auditoria`,      auditoriaRoutes)

// ── 404
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Ruta no encontrada" },
  });
});

// ── Error handler global (siempre al final)
app.use(errorHandler);

export default app;
