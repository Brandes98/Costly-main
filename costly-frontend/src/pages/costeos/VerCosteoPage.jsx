import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import {
  useImportaciones, useImportacion, useTCHoy, usePedidos, useCosteos
} from '../../hooks/useApi'
import { fmtCurrency, fmtDate } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import { exportarCosteoPDF, exportarCosteoExcel } from '../../hooks/useExport'

const ESTADO_PILL  = { borrador:'pill pill-gray', confirmado:'pill pill-yellow', aprobado:'pill pill-green' }
const ESTADO_LABEL = { borrador:'Borrador', confirmado:'Confirmado', aprobado:'Aprobado' }

const schema = z.object({
  importacion_id: z.coerce.number().optional().or(z.literal('')),
  tc_usd_crc:     z.coerce.number().positive().default(1),
  flete_maritimo: z.coerce.number().min(0).default(0),
  seguro:         z.coerce.number().min(0).default(0),
  imp_dif_iva:    z.coerce.number().min(0).default(0),
  isc_pct:        z.coerce.number().min(0).max(100).default(0),
  agente_aduana:  z.coerce.number().min(0).default(0),
  flete_cr:       z.coerce.number().min(0).default(0),
  bodega:         z.coerce.number().min(0).default(0),
  margen_default: z.coerce.number().min(0).max(100).default(35),
})

// ── Resumen lateral (solo lectura)
function ResumenLateral({ fob, cif, val_cif, arancel, isc, otros, total, tc, tcFecha, margen, pvTotal, utilidad }) {
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="card-header"><div className="card-title">📊 Resumen del costeo</div></div>
        <div className="p-4 space-y-2">
          {[
            ['Costo origen (FOB)', fmtCurrency(fob,'USD'), false],
            ['Flete + seguro',     fmtCurrency(cif,'USD'), false],
            ['Valor CIF',         fmtCurrency(val_cif,'USD'), true],
            ['Arancel',           fmtCurrency(arancel,'USD'), false],
            ['Agente + otros CR', fmtCurrency(otros,'USD'), false],
          ].map(([l,v,hl]) => (
            <div key={l} className="flex justify-between py-1 border-b border-border-lt text-xs">
              <span className="text-mist">{l}</span>
              <span className={`font-semibold ${hl ? 'text-tl' : ''}`}>{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t-2 border-border">
            <span className="font-semibold text-sm">Costo total CR</span>
            <span className="font-bold text-base text-ink">{fmtCurrency(total,'USD')}</span>
          </div>
          {pvTotal > 0 && (
            <div className="bg-gd-l rounded-card p-3 mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gd">Precio venta total ({margen}%)</span>
                <span className="font-bold text-gd">{fmtCurrency(pvTotal,'USD')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-mist">Utilidad bruta</span>
                <span className="font-semibold text-sg">{fmtCurrency(utilidad,'USD')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">💱 Tipo de cambio</div></div>
        <div className="p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-mist">USD/CRC</span>
            <span className="font-semibold">₡{Number(tc||0).toLocaleString('es-CR',{minimumFractionDigits:2})}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mist">Fuente</span>
            <span className="pill pill-blue">BCCR</span>
          </div>
          {tcFecha && (
            <div className="flex justify-between">
              <span className="text-mist">Fecha</span>
              <span>{fmtDate(tcFecha)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerCosteoPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [paso, setPaso] = useState(3) // solo pasos 3 y 4
  const [conIVI, setConIVI] = useState(false)
  const [tipoCosteo, setTipoCosteo] = useState(null)
  const [pedidosSel, setPedidosSel] = useState([])

  const { data: costeos = [], isLoading } = useCosteos()
  const { data: importaciones = [] }      = useImportaciones()
  const { data: pedidos = [] }            = usePedidos()
  const { data: tcHoy }                   = useTCHoy()

  const costeo = costeos.find(c => c.costeo_id === Number(id))

  const { register, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tc_usd_crc: 1, flete_maritimo: 0, seguro: 0, imp_dif_iva: 0,
      isc_pct: 0, agente_aduana: 0, flete_cr: 0, bodega: 0, margen_default: 35,
    }
  })

  // Precargar datos del costeo
  useEffect(() => {
    if (!costeo) return
    setTipoCosteo(costeo.tipo === 'aproximacion' ? 'aproximacion' : 'real')
    if (costeo.tipo === 'aproximacion') {
      setPedidosSel(costeo.pedidos_rel?.map(r => r.pedido_id) || [])
    }
    reset({
      importacion_id: costeo.importacion_id || costeo.importaciones_rel?.[0]?.importacion_id || '',
      tc_usd_crc:     Number(costeo.tc_usd_crc),
      flete_maritimo: Number(costeo.flete_maritimo)||0,
      seguro:         Number(costeo.seguro)||0,
      imp_dif_iva:    Number(costeo.arancel_monto)||0,
      isc_pct:        Number(costeo.isc_pct)||0,
      agente_aduana:  Number(costeo.agente_aduana)||0,
      flete_cr:       Number(costeo.flete_cr)||0,
      bodega:         Number(costeo.bodega_costo)||0,
      margen_default: Number(costeo.margen_global)||35,
    })
  }, [costeo])

  const w = watch()
  const importacionSelId = w?.importacion_id ? Number(w.importacion_id) : null
  const { data: importacionSel } = useImportacion(importacionSelId)

  const impSel = importacionSel || importaciones.find(i => i.importacion_id === Number(w.importacion_id))
  const lineas = impSel?.pedidos?.flatMap(p => p.lineas || []) || []

  const lineasAprox   = tipoCosteo === 'aproximacion'
    ? pedidos.filter(p => pedidosSel.includes(p.pedido_id)).flatMap(p => p.lineas || [])
    : []
  const lineasActivas = tipoCosteo === 'aproximacion' ? lineasAprox : lineas

  const fob_total  = lineasActivas.reduce((s,l) => s + Number(l.total_linea || 0), 0)
  const cif        = (Number(w.flete_maritimo)||0) + (Number(w.seguro)||0)
  const val_cif    = fob_total + cif
  const arancel    = (Number(w.imp_dif_iva)||0)
  const isc        = val_cif * ((Number(w.isc_pct)||0)/100)
  const otros      = (Number(w.agente_aduana)||0)+(Number(w.flete_cr)||0)+(Number(w.bodega)||0)
  const total_cr   = val_cif + arancel + isc + otros
  const margen     = Number(w.margen_default) || 35
  const pesoTotal  = lineasActivas.reduce((s,l) => s + Number(l.peso_total_kg||0), 0)

  const calcLinea = (l) => {
    const fobLinea     = Number(l.total_linea || 0)
    const cant         = Number(l.cantidad) || 1
    const pesoLinea    = Number(l.peso_total_kg || 0)
    const pct          = pesoTotal > 0
      ? (pesoLinea / pesoTotal)
      : (fob_total > 0 ? fobLinea / fob_total : 0)
    const fobUnit      = fobLinea / cant
    const fleteSeguro  = cif * pct
    const cifLinea     = fobLinea + fleteSeguro
    const impLinea     = arancel * pct
    const agenteLinea  = (Number(w.agente_aduana)||0) * pct
    const fleteCrLinea = (Number(w.flete_cr)||0) * pct
    const bodegaLinea  = (Number(w.bodega)||0) * pct
    const otrosLinea   = 0
    const costoTotal   = cifLinea + impLinea + agenteLinea + fleteCrLinea + bodegaLinea
    const costoUnitCR  = costoTotal / cant
    const pVentaUnit   = costoUnitCR * (1 + margen/100) * (conIVI ? 1.13 : 1)
    const pVentaTotal  = pVentaUnit * cant
    return { fobLinea, fobUnit, fleteSeguro, cifLinea, impLinea, agenteLinea, fleteCrLinea, bodegaLinea, otrosLinea, costoTotal, costoUnitCR, pVentaUnit, pVentaTotal }
  }

  const pvTotal  = lineasActivas.reduce((s,l) => s + calcLinea(l).pVentaTotal, 0)
  const utilidad = lineasActivas.reduce((s,l) => s + (calcLinea(l).pVentaTotal - calcLinea(l).costoTotal), 0)
//------------------Exportar a PDF Y EXCEL---------------------
const handleExport = (tipo) => {
  const pedidosInfo = tipoCosteo === 'aproximacion'
    ? pedidos.filter(p => pedidosSel.includes(p.pedido_id))
    : impSel?.pedidos || []

  const lineasConCalc = lineasActivas.map(l => {
    const pedidoOrigen = tipoCosteo === 'aproximacion'
      ? pedidos.find(p => p.pedido_id === l.pedido_id)
      : impSel?.pedidos?.find(p => (p.lineas||[]).some(lp => lp.linea_id === l.linea_id))
    return {
      linea: l,
      calc: calcLinea(l),
      pedidoCodigo: pedidoOrigen?.codigo || '—'
    }
  })

  const datos = {
    costeo: {
      ...costeo,
      referencia: costeo.importaciones_rel?.map(r => r.importacion?.codigo).join('+') ||
                  costeo.pedidos_rel?.map(r => r.pedido?.codigo).join('+') || String(costeo.costeo_id),
    },
    lineas:      lineasConCalc,
    calculos:    { fob_total, cif, val_cif, arancel, isc, otros, total_cr, margen, pvTotal, utilidad },
    pedidosInfo,
  }

  if (tipo === 'pdf')   exportarCosteoPDF(costeo.costeo_id, datos)
  if (tipo === 'excel') exportarCosteoExcel(costeo.costeo_id, datos)
}
//-------------------------------------------------------------
  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!costeo)   return <div className="p-12 text-center text-mist">Costeo no encontrado</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-ink flex items-center gap-2">
            👁 Ver costeo
            <span className={ESTADO_PILL[costeo.estado] || 'pill pill-gray'}>
              {ESTADO_LABEL[costeo.estado] || costeo.estado}
            </span>
          </div>
          <div className="text-xs text-mist mt-0.5">
            {costeo.tipo === 'aproximacion'
              ? `🧮 Aproximación · ${costeo.pedidos_rel?.map(r => r.pedido?.codigo).join(' + ') || '—'}`
              : `🚢 Real · ${costeo.importaciones_rel?.map(r => r.importacion?.codigo).join(' + ') || '—'}`
            }
          </div>
        </div>
       <div className="flex gap-2">
  <button className="btn btn-outline text-xs" onClick={() => handleExport('excel')}>📊 Excel</button>
  <button className="btn btn-outline text-xs" onClick={() => handleExport('pdf')}>📄 PDF</button>
  <button className="btn btn-outline text-xs" onClick={() => navigate('/costeos')}>← Volver</button>
</div>
      </div>

      {/* Tabs paso 3 / paso 4 */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          className={`text-xs font-semibold px-4 py-2 rounded-t transition-colors ${paso === 3 ? 'bg-tl text-white' : 'text-mist hover:text-ink'}`}
          onClick={() => setPaso(3)}
        >
          💰 Margen y precios
        </button>
        <button
          className={`text-xs font-semibold px-4 py-2 rounded-t transition-colors ${paso === 4 ? 'bg-tl text-white' : 'text-mist hover:text-ink'}`}
          onClick={() => setPaso(4)}
        >
          ✅ Resumen
        </button>
      </div>

      {/* ── PASO 3: Margen (solo lectura) */}
      {paso === 3 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Margen y precio de venta</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate font-semibold">Margen global:</span>
                  <span className="w-16 h-8 border border-border rounded-md flex items-center justify-center text-xs font-bold bg-sur2 text-ink">
                    {margen}%
                  </span>
                  {conIVI && <span className="pill pill-blue text-[9px]">Con IVI</span>}
                </div>
              </div>

              {/* Banner solo lectura */}
              <div className="mx-4 mt-3 rounded-card border border-tl/20 bg-tl-xl px-3 py-2 text-xs text-tl flex items-center gap-2">
                <span>👁</span>
                <span>Modo solo lectura — no se pueden modificar los valores</span>
              </div>

              <div className="overflow-x-auto mt-3">
                {lineasActivas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-mist">No hay líneas de producto para mostrar</div>
                ) : (
                  <table style={{minWidth:'1100px',width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-sur2">
                        {[
                          {h:'Producto',      w:'180px'},
                          {h:'Cant.',         w:'60px'},
                          {h:'FOB unit',      w:'90px'},
                          {h:'Flete+Seguro',  w:'100px'},
                          {h:'Costo CIF',     w:'100px'},
                          {h:'Imp. dif. IVA', w:'95px'},
                          {h:'Agente',        w:'85px'},
                          {h:'Flete CR',      w:'85px'},
                          {h:'Bodega',        w:'80px'},
                          {h:'Otros',         w:'80px'},
                          {h:'Costo total',   w:'100px'},
                          {h:'Costo unit CR', w:'100px'},
                          {h:'Margen %',      w:'75px'},
                          {h:'P. Venta unit', w:'100px'},
                        ].map(({h,w}) => (
                          <th key={h} style={{minWidth:w}} className="text-[9px] font-semibold text-mist uppercase tracking-wider px-2 py-2 text-right border-b border-border first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineasActivas.map((l,i) => {
                        const c = calcLinea(l)
                        const fmt = (v) => fmtCurrency(v, 'USD')
                        return (
                          <tr key={l.linea_id||i} className="border-b border-border-lt hover:bg-sur2/50">
                            <td className="px-2 py-2 text-left">
                              <div className="font-medium text-xs">{l.producto?.nombre||l.producto_id}</div>
                              <div className="text-[9px] text-mist">{l.producto?.sku}</div>
                            </td>
                            <td className="px-2 py-2 text-xs text-right">{Number(l.cantidad).toLocaleString('en')}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.fobUnit)}</td>
                            <td className="px-2 py-2 text-xs text-right text-mist">{fmt(c.fleteSeguro)}</td>
                            <td className="px-2 py-2 text-xs text-right font-semibold text-tl">{fmt(c.cifLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.impLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.agenteLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.fleteCrLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.bodegaLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.otrosLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-ink">{fmt(c.costoTotal)}</td>
                            <td className="px-2 py-2 text-xs text-right font-semibold">{fmt(c.costoUnitCR)}</td>
                            <td className="px-2 py-2 text-xs text-right">{margen}%</td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-gd">{fmt(c.pVentaUnit)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const tots = lineasActivas.reduce((acc, l) => {
                          const c = calcLinea(l)
                          return {
                            fobLinea:    acc.fobLinea    + c.fobLinea,
                            fleteSeguro: acc.fleteSeguro + c.fleteSeguro,
                            cifLinea:    acc.cifLinea    + c.cifLinea,
                            impLinea:    acc.impLinea    + c.impLinea,
                            agenteLinea: acc.agenteLinea + c.agenteLinea,
                            fleteCrLinea:acc.fleteCrLinea+ c.fleteCrLinea,
                            bodegaLinea: acc.bodegaLinea + c.bodegaLinea,
                            costoTotal:  acc.costoTotal  + c.costoTotal,
                            pVentaTotal: acc.pVentaTotal + c.pVentaTotal,
                          }
                        }, {fobLinea:0,fleteSeguro:0,cifLinea:0,impLinea:0,agenteLinea:0,fleteCrLinea:0,bodegaLinea:0,costoTotal:0,pVentaTotal:0})
                        const fmt = (v) => fmtCurrency(v,'USD')
                        return (
                          <tr className="bg-sur2 font-bold border-t-2 border-border">
                            <td className="px-2 py-2 text-xs text-mist font-semibold" colSpan={2}>TOTALES</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.fobLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.fleteSeguro)}</td>
                            <td className="px-2 py-2 text-xs text-right text-tl">{fmt(tots.cifLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.impLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.agenteLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.fleteCrLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(tots.bodegaLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">—</td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-ink">{fmt(tots.costoTotal)}</td>
                            <td className="px-2 py-2 text-xs text-right" colSpan={2}></td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-gd">{fmt(tots.pVentaTotal)}</td>
                          </tr>
                        )
                      })()}
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary text-xs" onClick={() => setPaso(4)}>Ver resumen →</button>
            </div>
          </div>
          <ResumenLateral fob={fob_total} cif={cif} val_cif={val_cif} arancel={arancel} isc={isc} otros={otros} total={total_cr} tc={w.tc_usd_crc} tcFecha={tcHoy?.fecha} margen={margen} pvTotal={pvTotal} utilidad={utilidad} />
        </div>
      )}

      {/* ── PASO 4: Resumen (solo lectura) */}
      {paso === 4 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="card">
              <div className="card-header"><div className="card-title">✅ Resumen del costeo</div></div>
              <div className="p-4 space-y-3">
                {[
                  ['Tipo',           costeo.tipo === 'aproximacion' ? '🧮 Aproximación' : '🚢 Real'],
                  ['Importación / Pedidos', costeo.importaciones_rel?.map(r=>r.importacion?.codigo).join(' + ') || costeo.pedidos_rel?.map(r=>r.pedido?.codigo).join(' + ') || '—'],
                  ['TC USD/CRC',     `₡${Number(w.tc_usd_crc).toLocaleString('es-CR',{minimumFractionDigits:2})}`],
                  ['Flete',          fmtCurrency(Number(w.flete_maritimo),'USD')],
                  ['Seguro',         fmtCurrency(Number(w.seguro),'USD')],
                  ['Arancel (monto)',fmtCurrency(Number(w.imp_dif_iva||0),'USD')],
                  ['ISC',            `${w.isc_pct}%`],
                  ['Agente aduanero',fmtCurrency(Number(w.agente_aduana),'USD')],
                  ['Flete CR',       fmtCurrency(Number(w.flete_cr),'USD')],
                  ['Bodega',         fmtCurrency(Number(w.bodega),'USD')],
                  ['Margen',         `${w.margen_default}%`],
                ].map(([k,v],i) => (
                  <div key={k} className={`flex justify-between py-1.5 text-xs ${i<10?'border-b border-border-lt':''}`}>
                    <span className="text-mist">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-border">
                  <span className="font-semibold text-sm">Costo total CR</span>
                  <span className="font-bold text-base text-tl">{fmtCurrency(total_cr,'USD')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => setPaso(3)}>← Margen y precios</button>
              <button className="btn btn-outline text-xs" onClick={() => navigate('/costeos')}>← Volver a costeos</button>
            </div>
          </div>
          <ResumenLateral fob={fob_total} cif={cif} val_cif={val_cif} arancel={arancel} isc={isc} otros={otros} total={total_cr} tc={w.tc_usd_crc} tcFecha={tcHoy?.fecha} margen={margen} pvTotal={pvTotal} utilidad={utilidad} />
        </div>
      )}
    </div>
  )
}
