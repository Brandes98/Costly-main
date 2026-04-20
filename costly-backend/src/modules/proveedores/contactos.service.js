// ============================================================
// src/modules/proveedores/contactos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

// ── Listar contactos de un proveedor
export const getContactos = async (empresa_id, proveedor_id) => {
  // Verificar que el proveedor pertenece a la empresa
  const prov = await prisma.proveedor.findFirst({
    where: { proveedor_id: parseInt(proveedor_id), empresa_id }
  })
  if (!prov) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  return prisma.contacto_proveedor.findMany({
    where: { proveedor_id: parseInt(proveedor_id), activo: true },
    orderBy: [{ predeterminado: 'desc' }, { creado_en: 'asc' }]
  })
}

// ── Crear contacto
export const createContacto = async (empresa_id, proveedor_id, data) => {
  const prov = await prisma.proveedor.findFirst({
    where: { proveedor_id: parseInt(proveedor_id), empresa_id }
  })
  if (!prov) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  return prisma.$transaction(async (tx) => {
    // Si este es predeterminado, quitar predeterminado de los demás
    if (data.predeterminado) {
      await tx.contacto_proveedor.updateMany({
        where: { proveedor_id: parseInt(proveedor_id) },
        data: { predeterminado: false }
      })
    }
    return tx.contacto_proveedor.create({
      data: {
        proveedor_id: parseInt(proveedor_id),
        nombre:         data.nombre,
        cargo:          data.cargo || null,
        email:          data.email || null,
        telefono:       data.telefono || null,
        predeterminado: data.predeterminado || false,
      }
    })
  })
}

// ── Actualizar contacto
export const updateContacto = async (empresa_id, proveedor_id, contacto_id, data) => {
  const contacto = await prisma.contacto_proveedor.findFirst({
    where: {
      contacto_id: parseInt(contacto_id),
      proveedor: { proveedor_id: parseInt(proveedor_id), empresa_id }
    }
  })
  if (!contacto) throw new AppError('Contacto no encontrado', 404, 'CONTACTO_NOT_FOUND')

  return prisma.$transaction(async (tx) => {
    if (data.predeterminado) {
      await tx.contacto_proveedor.updateMany({
        where: { proveedor_id: parseInt(proveedor_id) },
        data: { predeterminado: false }
      })
    }
    return tx.contacto_proveedor.update({
      where: { contacto_id: parseInt(contacto_id) },
      data: {
        ...(data.nombre    !== undefined && { nombre:    data.nombre }),
        ...(data.cargo     !== undefined && { cargo:     data.cargo }),
        ...(data.email     !== undefined && { email:     data.email }),
        ...(data.telefono  !== undefined && { telefono:  data.telefono }),
        ...(data.predeterminado !== undefined && { predeterminado: data.predeterminado }),
      }
    })
  })
}

// ── Marcar como predeterminado
export const setPredeterminado = async (empresa_id, proveedor_id, contacto_id) => {
  const contacto = await prisma.contacto_proveedor.findFirst({
    where: {
      contacto_id: parseInt(contacto_id),
      proveedor: { proveedor_id: parseInt(proveedor_id), empresa_id }
    }
  })
  if (!contacto) throw new AppError('Contacto no encontrado', 404, 'CONTACTO_NOT_FOUND')

  return prisma.$transaction(async (tx) => {
    await tx.contacto_proveedor.updateMany({
      where: { proveedor_id: parseInt(proveedor_id) },
      data: { predeterminado: false }
    })
    return tx.contacto_proveedor.update({
      where: { contacto_id: parseInt(contacto_id) },
      data: { predeterminado: true }
    })
  })
}

// ── Eliminar contacto (soft delete)
export const deleteContacto = async (empresa_id, proveedor_id, contacto_id) => {
  const contacto = await prisma.contacto_proveedor.findFirst({
    where: {
      contacto_id: parseInt(contacto_id),
      proveedor: { proveedor_id: parseInt(proveedor_id), empresa_id }
    }
  })
  if (!contacto) throw new AppError('Contacto no encontrado', 404, 'CONTACTO_NOT_FOUND')
  if (contacto.predeterminado) throw new AppError(
    'No podés eliminar el contacto predeterminado. Asigná otro primero.',
    400, 'CONTACTO_PREDETERMINADO'
  )

  return prisma.contacto_proveedor.update({
    where: { contacto_id: parseInt(contacto_id) },
    data: { activo: false }
  })
}
