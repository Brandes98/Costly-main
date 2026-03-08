-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'operador_sr', 'operador', 'finanzas', 'consultas');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'confirmado', 'en_produccion', 'listo_fabrica', 'embarcado', 'en_transito', 'en_puerto_cr', 'en_aduana', 'en_bodega', 'entregado', 'cerrado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('borrador', 'en_proceso', 'en_transito', 'en_aduana', 'en_bodega', 'cerrada');

-- CreateEnum
CREATE TYPE "EstadoCosteo" AS ENUM ('borrador', 'confirmado', 'aprobado');

-- CreateEnum
CREATE TYPE "EstadoContenedor" AS ENUM ('programado', 'pre_embarque', 'en_transito', 'en_puerto', 'en_aduana', 'en_bodega', 'retirado');

-- CreateEnum
CREATE TYPE "TipoHito" AS ENUM ('confirmacion', 'pago_senal', 'produccion', 'embarque', 'llegada_cr', 'retiro_aduana', 'entrega_bodega', 'entrega_cliente', 'personalizado');

-- CreateEnum
CREATE TYPE "EstadoHito" AS ENUM ('pendiente', 'en_proceso', 'completado', 'vencido');

-- CreateEnum
CREATE TYPE "EstadoTramite" AS ENUM ('pendiente', 'en_proceso', 'aprobado', 'objetado');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('senal', 'saldo', 'total', 'anticipo', 'devolucion');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('programado', 'procesado', 'confirmado', 'devuelto');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('swift', 'transferencia_local', 'cheque', 'efectivo');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('comercial', 'proforma', 'credito');

-- CreateEnum
CREATE TYPE "FuenteTC" AS ENUM ('bccr', 'manual', 'hacienda');

-- CreateEnum
CREATE TYPE "TipoPermiso" AS ENUM ('minae', 'senasa', 'minsa', 'sutel', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPermiso" AS ENUM ('pendiente', 'en_tramite', 'aprobado', 'rechazado', 'vencido');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('factura', 'bl', 'dua', 'permiso', 'seguro', 'packing', 'otro');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT');

-- CreateEnum
CREATE TYPE "TipoContenedor" AS ENUM ('GP20', 'GP40', 'HC40', 'LCL', 'aereo');

-- CreateEnum
CREATE TYPE "TipoEstiba" AS ENUM ('pallet_americano', 'pallet_europeo', 'pallet_medida', 'sin_pallet', 'otro');

-- CreateEnum
CREATE TYPE "AccionHistorialUnion" AS ENUM ('union', 'separacion');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('nacional', 'exportacion', 'interno');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10', 'r11', 'r12', 'dinamico');

-- CreateTable
CREATE TABLE "empresa" (
    "empresa_id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "ruc" VARCHAR(20) NOT NULL,
    "moneda_base" CHAR(3) NOT NULL DEFAULT 'USD',
    "margen_default" DECIMAL(5,2),
    "iva_pct" DECIMAL(5,2) NOT NULL DEFAULT 13,
    "ivi_pct" DECIMAL(5,2) NOT NULL DEFAULT 13,
    "tc_fuente" "FuenteTC" NOT NULL DEFAULT 'bccr',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("empresa_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "usuario_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "pais" (
    "pais_id" SERIAL NOT NULL,
    "codigo" CHAR(2) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "bandera" CHAR(8),
    "region" VARCHAR(60),

    CONSTRAINT "pais_pkey" PRIMARY KEY ("pais_id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "proveedor_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "pais_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "ciudad" VARCHAR(100),
    "incoterm_pref" CHAR(3),
    "moneda" CHAR(3) NOT NULL,
    "dias_transito" SMALLINT,
    "puerto_origen" VARCHAR(80),
    "condiciones_pago" VARCHAR(100),
    "contacto" VARCHAR(100),
    "email" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("proveedor_id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "cliente_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "cedula" VARCHAR(20),
    "tipo" "TipoCliente" NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "descuento_pct" DECIMAL(5,2),
    "email" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("cliente_id")
);

-- CreateTable
CREATE TABLE "producto" (
    "producto_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "categoria" VARCHAR(80),
    "cod_arancelario" VARCHAR(20),
    "arancel_pct" DECIMAL(5,2),
    "isc_pct" DECIMAL(5,2),
    "peso_kg" DECIMAL(10,3),
    "largo_cm" DECIMAL(10,2),
    "ancho_cm" DECIMAL(10,2),
    "alto_cm" DECIMAL(10,2),
    "volumen_m3" DECIMAL(10,4),
    "unidades_por_caja" INTEGER,
    "peso_caja_kg" DECIMAL(10,3),
    "volumen_caja_m3" DECIMAL(10,4),
    "tipo_estiba" "TipoEstiba" NOT NULL DEFAULT 'pallet_americano',
    "pallet_largo_cm" DECIMAL(10,2),
    "pallet_ancho_cm" DECIMAL(10,2),
    "pallet_alto_max_cm" DECIMAL(10,2),
    "pallet_peso_max_kg" DECIMAL(10,3),
    "nota_estiba" TEXT,
    "requiere_permiso" BOOLEAN NOT NULL DEFAULT false,
    "permiso_tipo" VARCHAR(80),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("producto_id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "pedido_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "importacion_id" INTEGER,
    "proveedor_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "creado_por" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "codigo_padre" VARCHAR(30),
    "subindice" VARCHAR(5),
    "fecha_pedido" DATE NOT NULL,
    "incoterm" CHAR(3) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'borrador',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("pedido_id")
);

-- CreateTable
CREATE TABLE "importacion" (
    "importacion_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(200),
    "fecha_union" DATE,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'borrador',
    "consolidado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacion_pkey" PRIMARY KEY ("importacion_id")
);

-- CreateTable
CREATE TABLE "linea_pedido" (
    "linea_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "numero" SMALLINT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio_unit" DECIMAL(14,4) NOT NULL,
    "total_linea" DECIMAL(16,4) NOT NULL,
    "pct_peso" DECIMAL(7,4),
    "nota" VARCHAR(200),
    "estiba_override" BOOLEAN NOT NULL DEFAULT false,
    "tipo_estiba_linea" "TipoEstiba",
    "pallet_largo_cm" DECIMAL(10,2),
    "pallet_ancho_cm" DECIMAL(10,2),
    "pallet_alto_max_cm" DECIMAL(10,2),
    "pallet_peso_max_kg" DECIMAL(10,3),
    "nota_estiba_linea" TEXT,
    "volumen_total_m3" DECIMAL(10,4),
    "peso_total_kg" DECIMAL(10,3),
    "cajas_estimadas" INTEGER,

    CONSTRAINT "linea_pedido_pkey" PRIMARY KEY ("linea_id")
);

-- CreateTable
CREATE TABLE "factura_prov" (
    "factura_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "numero" VARCHAR(60) NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(16,4) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "tipo" "TipoFactura" NOT NULL,

    CONSTRAINT "factura_prov_pkey" PRIMARY KEY ("factura_id")
);

-- CreateTable
CREATE TABLE "costeo" (
    "costeo_id" SERIAL NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "aprobado_por" INTEGER,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "estado" "EstadoCosteo" NOT NULL DEFAULT 'borrador',
    "flete_maritimo" DECIMAL(14,4),
    "seguro" DECIMAL(14,4),
    "arancel_pct" DECIMAL(5,2),
    "arancel_monto" DECIMAL(14,4),
    "agente_aduana" DECIMAL(14,4),
    "flete_cr" DECIMAL(14,4),
    "isc_pct" DECIMAL(5,2),
    "isc_monto" DECIMAL(14,4),
    "bodega_costo" DECIMAL(14,4),
    "bodega_periodo" SMALLINT,
    "otros_costos" DECIMAL(14,4),
    "otros_desc" VARCHAR(200),
    "tc_usd_crc" DECIMAL(10,4) NOT NULL,
    "tc_fuente" VARCHAR(50),
    "costo_origen" DECIMAL(16,4) NOT NULL,
    "valor_cif" DECIMAL(16,4) NOT NULL,
    "costo_total_cr" DECIMAL(16,4) NOT NULL,
    "iva_ref_d150" DECIMAL(16,4),
    "margen_global" DECIMAL(5,2),
    "precio_venta_total" DECIMAL(16,4),
    "utilidad_bruta" DECIMAL(16,4),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprobado_en" TIMESTAMP(3),

    CONSTRAINT "costeo_pkey" PRIMARY KEY ("costeo_id")
);

-- CreateTable
CREATE TABLE "linea_costeo" (
    "lc_id" SERIAL NOT NULL,
    "costeo_id" INTEGER NOT NULL,
    "linea_id" INTEGER NOT NULL,
    "pct_peso" DECIMAL(7,4) NOT NULL,
    "dist_logistica" DECIMAL(14,4) NOT NULL,
    "costo_unit_cr" DECIMAL(14,4) NOT NULL,
    "margen_pct" DECIMAL(5,2) NOT NULL,
    "precio_venta_u" DECIMAL(14,4) NOT NULL,
    "precio_venta_t" DECIMAL(16,4) NOT NULL,
    "utilidad" DECIMAL(14,4) NOT NULL,
    "ivi_incluido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "linea_costeo_pkey" PRIMARY KEY ("lc_id")
);

-- CreateTable
CREATE TABLE "contenedor" (
    "contenedor_id" SERIAL NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "tipo" "TipoContenedor",
    "naviera" VARCHAR(80),
    "bl_numero" VARCHAR(60),
    "puerto_origen" VARCHAR(80),
    "puerto_destino" VARCHAR(80),
    "fecha_salida" DATE,
    "eta_cr" DATE,
    "fecha_arribo" DATE,
    "estado" "EstadoContenedor" NOT NULL DEFAULT 'programado',

    CONSTRAINT "contenedor_pkey" PRIMARY KEY ("contenedor_id")
);

-- CreateTable
CREATE TABLE "hito" (
    "hito_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "responsable_id" INTEGER,
    "tipo" "TipoHito" NOT NULL,
    "fecha_plan" DATE,
    "fecha_real" DATE,
    "estado" "EstadoHito" NOT NULL DEFAULT 'pendiente',
    "alerta_enviada" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,

    CONSTRAINT "hito_pkey" PRIMARY KEY ("hito_id")
);

-- CreateTable
CREATE TABLE "tramite_aduana" (
    "tramite_id" SERIAL NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "agente_id" INTEGER,
    "dua_numero" VARCHAR(40),
    "tc_hacienda" DECIMAL(10,4),
    "fecha_dua" DATE,
    "almacen_fiscal" VARCHAR(120),
    "valor_cif_cr" DECIMAL(16,4),
    "total_tributos" DECIMAL(16,4),
    "estado" "EstadoTramite" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "tramite_aduana_pkey" PRIMARY KEY ("tramite_id")
);

-- CreateTable
CREATE TABLE "pago" (
    "pago_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "registrado_por" INTEGER NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "monto" DECIMAL(16,4) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "tc_usado" DECIMAL(10,4),
    "fecha_pago" DATE NOT NULL,
    "fecha_limite" DATE,
    "metodo" "MetodoPago",
    "referencia" VARCHAR(100),
    "estado" "EstadoPago" NOT NULL DEFAULT 'programado',
    "comprobante_url" VARCHAR(300),
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("pago_id")
);

-- CreateTable
CREATE TABLE "tc_historico" (
    "tc_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "usd_crc" DECIMAL(10,4) NOT NULL,
    "eur_crc" DECIMAL(10,4),
    "eur_usd" DECIMAL(10,6),
    "fuente" "FuenteTC" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tc_historico_pkey" PRIMARY KEY ("tc_id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "permiso_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "producto_id" INTEGER,
    "tipo" "TipoPermiso" NOT NULL,
    "numero" VARCHAR(60),
    "estado" "EstadoPermiso" NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" DATE,
    "fecha_aprobacion" DATE,
    "fecha_vencimiento" DATE,
    "url_documento" VARCHAR(300),
    "nota" TEXT,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("permiso_id")
);

-- CreateTable
CREATE TABLE "documento" (
    "doc_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "subido_por" INTEGER NOT NULL,
    "entidad_tipo" VARCHAR(40) NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "tipo_doc" "TipoDocumento" NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "tamanio_kb" INTEGER,
    "mime_type" VARCHAR(80),
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("doc_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "audit_id" BIGSERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad_tipo" VARCHAR(60) NOT NULL,
    "entidad_id" INTEGER,
    "campo" VARCHAR(80),
    "valor_antes" JSONB,
    "valor_despues" JSONB,
    "ip" VARCHAR(45),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "reporte" (
    "reporte_id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoReporte" NOT NULL,
    "config_json" JSONB NOT NULL,
    "publico" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_pkey" PRIMARY KEY ("reporte_id")
);

-- CreateTable
CREATE TABLE "pedidos_historial_union" (
    "historial_id" SERIAL NOT NULL,
    "importacion_id" INTEGER,
    "pedido_id" INTEGER NOT NULL,
    "accion" "AccionHistorialUnion" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" INTEGER NOT NULL,
    "nota" TEXT,

    CONSTRAINT "pedidos_historial_union_pkey" PRIMARY KEY ("historial_id")
);

-- CreateTable
CREATE TABLE "proyeccion_volumen" (
    "proyeccion_id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "tipo_pallet_default" "TipoEstiba" NOT NULL DEFAULT 'pallet_americano',
    "volumen_total_m3" DECIMAL(10,4) NOT NULL,
    "peso_total_kg" DECIMAL(10,3) NOT NULL,
    "pallets_americanos" INTEGER,
    "pallets_europeos" INTEGER,
    "items_sin_pallet" INTEGER DEFAULT 0,
    "items_pallet_medida" INTEGER DEFAULT 0,
    "items_especiales" INTEGER DEFAULT 0,
    "contenedor_sugerido" VARCHAR(20) NOT NULL,
    "contenedores_cant" INTEGER DEFAULT 1,
    "tiene_carga_especial" BOOLEAN NOT NULL DEFAULT false,
    "notas_especiales" TEXT,
    "calculado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyeccion_volumen_pkey" PRIMARY KEY ("proyeccion_id")
);

-- CreateTable
CREATE TABLE "proyeccion_detalle" (
    "detalle_id" SERIAL NOT NULL,
    "proyeccion_id" INTEGER NOT NULL,
    "linea_id" INTEGER NOT NULL,
    "tipo_estiba_usado" "TipoEstiba" NOT NULL,
    "volumen_m3" DECIMAL(10,4) NOT NULL,
    "peso_kg" DECIMAL(10,3) NOT NULL,
    "pallets_necesarios" DECIMAL(8,2),
    "es_especial" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,

    CONSTRAINT "proyeccion_detalle_pkey" PRIMARY KEY ("detalle_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_ruc_key" ON "empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pais_codigo_key" ON "pais"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_cedula_key" ON "cliente"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "producto_sku_key" ON "producto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_codigo_key" ON "pedido"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "importacion_codigo_key" ON "importacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "factura_prov_numero_key" ON "factura_prov"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "contenedor_codigo_key" ON "contenedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tramite_aduana_importacion_id_key" ON "tramite_aduana"("importacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "tramite_aduana_dua_numero_key" ON "tramite_aduana"("dua_numero");

-- CreateIndex
CREATE UNIQUE INDEX "tc_historico_fecha_key" ON "tc_historico"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "proyeccion_volumen_pedido_id_key" ON "proyeccion_volumen"("pedido_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_pais_id_fkey" FOREIGN KEY ("pais_id") REFERENCES "pais"("pais_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion"("importacion_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("proveedor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("cliente_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacion" ADD CONSTRAINT "importacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_pedido" ADD CONSTRAINT "linea_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_pedido" ADD CONSTRAINT "linea_pedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("producto_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_prov" ADD CONSTRAINT "factura_prov_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_prov" ADD CONSTRAINT "factura_prov_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("proveedor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costeo" ADD CONSTRAINT "costeo_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion"("importacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costeo" ADD CONSTRAINT "costeo_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costeo" ADD CONSTRAINT "costeo_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuario"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_costeo" ADD CONSTRAINT "linea_costeo_costeo_id_fkey" FOREIGN KEY ("costeo_id") REFERENCES "costeo"("costeo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_costeo" ADD CONSTRAINT "linea_costeo_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea_pedido"("linea_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenedor" ADD CONSTRAINT "contenedor_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion"("importacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hito" ADD CONSTRAINT "hito_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hito" ADD CONSTRAINT "hito_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuario"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramite_aduana" ADD CONSTRAINT "tramite_aduana_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion"("importacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramite_aduana" ADD CONSTRAINT "tramite_aduana_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "proveedor"("proveedor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("proveedor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_historico" ADD CONSTRAINT "tc_historico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permiso" ADD CONSTRAINT "permiso_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permiso" ADD CONSTRAINT "permiso_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("producto_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_historial_union" ADD CONSTRAINT "pedidos_historial_union_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion"("importacion_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_historial_union" ADD CONSTRAINT "pedidos_historial_union_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_historial_union" ADD CONSTRAINT "pedidos_historial_union_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyeccion_volumen" ADD CONSTRAINT "proyeccion_volumen_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyeccion_detalle" ADD CONSTRAINT "proyeccion_detalle_proyeccion_id_fkey" FOREIGN KEY ("proyeccion_id") REFERENCES "proyeccion_volumen"("proyeccion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyeccion_detalle" ADD CONSTRAINT "proyeccion_detalle_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea_pedido"("linea_id") ON DELETE RESTRICT ON UPDATE CASCADE;
