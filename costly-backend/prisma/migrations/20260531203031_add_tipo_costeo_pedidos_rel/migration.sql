-- AlterTable
ALTER TABLE "costeo" ADD COLUMN     "tipo" VARCHAR(20) DEFAULT 'real';

-- CreateTable
CREATE TABLE "costeo_pedido" (
    "costeo_id" INTEGER NOT NULL,
    "pedido_id" INTEGER NOT NULL,

    CONSTRAINT "costeo_pedido_pkey" PRIMARY KEY ("costeo_id","pedido_id")
);

-- AddForeignKey
ALTER TABLE "costeo_pedido" ADD CONSTRAINT "costeo_pedido_costeo_id_fkey" FOREIGN KEY ("costeo_id") REFERENCES "costeo"("costeo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costeo_pedido" ADD CONSTRAINT "costeo_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("pedido_id") ON DELETE RESTRICT ON UPDATE CASCADE;
