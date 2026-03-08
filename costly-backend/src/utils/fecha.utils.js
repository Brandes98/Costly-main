// Calcular días entre dos fechas
export const diasEntre = (fecha1, fecha2) => {
  const d1 = new Date(fecha1)
  const d2 = new Date(fecha2)
  const diff = d2 - d1
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Calcular estado del semáforo basado en fecha plan vs hoy
export const calcularSemaforo = (fechaPlan) => {
  if (!fechaPlan) return 'gris'
  const dias = diasEntre(new Date(), fechaPlan)
  if (dias < 0)  return 'rojo'    // vencido
  if (dias <= 3) return 'amarillo' // próximo a vencer
  return 'verde'
}

// Formatear fecha a string ISO (solo fecha)
export const formatFecha = (fecha) => {
  return new Date(fecha).toISOString().split('T')[0]
}

// Sumar días hábiles a una fecha
export const sumarDiasHabiles = (fecha, dias) => {
  const d = new Date(fecha)
  let agregados = 0
  while (agregados < dias) {
    d.setDate(d.getDate() + 1)
    const diaSemana = d.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) agregados++
  }
  return d
}
