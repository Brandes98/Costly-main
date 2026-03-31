<div class="content on" id="s-clientes">
  <div class="section-hdr mb14">
    <div>
      <div class="section-title">Clientes</div>
      <div style="font-size:11px;color:var(--mist)">Catálogos › Clientes</div>
    </div>
    <button class="btn btn-t btn-sm" onclick="document.getElementById('m-cliente').classList.add('on')">＋ Nuevo cliente</button>
  </div>
  <div class="card">
    <div class="c-hd">
      <div class="c-ti">🧑‍💼 Clientes</div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="tb-search"><span>🔍</span><input placeholder="Buscar cliente..."></div>
        <select class="rfi" style="height:32px"><option>Todos los tipos</option><option>Nacional</option><option>Exportación</option><option>Interno</option></select>
      </div>
    </div>
    <table class="tbl">
      <thead><tr><th>Nombre</th><th>Cédula/RUC</th><th>Tipo</th><th>Moneda</th><th>Descuento</th><th>Email</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        <tr><td><strong>Comercial XYZ S.A.</strong></td><td style="color:var(--mist)">3-101-456789</td><td><span class="pill pb">Nacional</span></td><td>CRC</td><td>5%</td><td style="color:var(--tl)">xyzsa@email.com</td><td><span class="pill pg">Activo</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-o btn-sm">✏️</button><button class="btn btn-r btn-sm">🗑</button></div></td></tr>
        <tr><td><strong>Dist. Beta Ltda.</strong></td><td style="color:var(--mist)">3-102-112233</td><td><span class="pill pv">Exportación</span></td><td>USD</td><td>—</td><td style="color:var(--tl)">beta@dist.com</td><td><span class="pill pg">Activo</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-o btn-sm">✏️</button><button class="btn btn-r btn-sm">🗑</button></div></td></tr>
        <tr><td><strong>Corp Gamma</strong></td><td style="color:var(--mist)">—</td><td><span class="pill pgr">Interno</span></td><td>USD</td><td>10%</td><td style="color:var(--mist)">—</td><td><span class="pill pr">Inactivo</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-o btn-sm">✏️</button><button class="btn btn-r btn-sm">🗑</button></div></td></tr>
      </tbody>
    </table>
  </div>
  <div class="modal-bg" id="m-cliente">
    <div class="modal">
      <div class="modal-hd"><div class="modal-ti">Nuevo cliente</div><span class="modal-x" onclick="document.getElementById('m-cliente').classList.remove('on')">×</span></div>
      <div class="modal-bd">
        <div class="fg2 mb14">
          <div><div class="fll">Nombre / Razón social *</div><input class="fi" placeholder="Ej: Distribuidora XYZ S.A."></div>
          <div><div class="fll">Cédula / RUC</div><input class="fi" placeholder="3-101-123456"></div>
        </div>
        <div class="fg3 mb14">
          <div><div class="fll">Tipo *</div><select class="fi"><option>Nacional</option><option>Exportación</option><option>Interno</option></select></div>
          <div><div class="fll">Moneda preferida *</div><select class="fi"><option>CRC — Colón</option><option>USD — Dólar</option><option>EUR — Euro</option></select></div>
          <div><div class="fll">Descuento %</div><input class="fi" placeholder="0" type="number"></div>
        </div>
        <div class="mb14"><div class="fll">Email de contacto</div><input class="fi" placeholder="contacto@empresa.com" type="email"></div>
      </div>
      <div class="modal-ft"><button class="btn btn-o" onclick="document.getElementById('m-cliente').classList.remove('on')">Cancelar</button><button class="btn btn-t">Crear cliente</button></div>
    </div>
  </div>
</div>