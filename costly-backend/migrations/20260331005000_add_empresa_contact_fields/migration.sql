-- Add contact fields to empresa
ALTER TABLE "empresa"
ADD COLUMN "email" VARCHAR(150),
ADD COLUMN "telefono" VARCHAR(20),
ADD COLUMN "direccion" VARCHAR(300),
ADD COLUMN "logo_url" VARCHAR(500);