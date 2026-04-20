-- CreateTable
CREATE TABLE "contacto_proveedor" (
    "contacto_id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "cargo" VARCHAR(80),
    "email" VARCHAR(150),
    "telefono" VARCHAR(50),
    "predeterminado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacto_proveedor_pkey" PRIMARY KEY ("contacto_id")
);

-- AddForeignKey
ALTER TABLE "contacto_proveedor" ADD CONSTRAINT "contacto_proveedor_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("proveedor_id") ON DELETE RESTRICT ON UPDATE CASCADE;
