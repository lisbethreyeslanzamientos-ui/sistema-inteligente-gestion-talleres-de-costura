// ─── CÁLCULO ─────────────────────────────────────────────────
function calcAll() {
  const cf    = getCF();
  const pm    = Math.max(gv('prendas-mes'), 1);
  const cuota = cf / pm;
  $('total-cf').textContent      = usd(cf);
  $('cuota-prenda').textContent   = usd(cuota);
  $('cuota-display2').textContent = usd(cuota);

  const mat = [1,2,3,4,5,6,7].reduce((s,i) => s + gv('m'+i), 0);
  $('sub-mat').textContent = usd(mat);

  const X            = gv('mo-cos');
  const pat          = X;
  const due          = X * 2;
  const rei          = X;
  const subtotalMano = X * 2;
  const subtotalGan  = X * 3;

  $('mo-pat').textContent  = usd(pat);
  $('mo-due').textContent  = usd(due);
  $('mo-rei').textContent  = usd(rei);
  $('sub-mano').textContent = usd(subtotalMano);
  $('sub-gan').textContent  = usd(subtotalGan);

  const precio   = mat + cuota + subtotalMano + subtotalGan;
  const ganancia = subtotalGan;

  $('res-mat').textContent        = usd(mat);
  $('res-cf').textContent         = usd(cuota);
  $('res-mo').textContent         = usd(subtotalMano);
  $('res-gan').textContent        = usd(subtotalGan);
  $('precio-final').textContent   = usd(precio);
  $('ganancia-display').textContent = usd(ganancia);
  $('nombre-display').textContent = $('nombre-prenda').value || 'Mi prenda';

  $('d-mat').textContent  = usd(mat);        $('dp-mat').textContent = pct(mat, precio);
  $('d-cf').textContent   = usd(cuota);      $('dp-cf').textContent  = pct(cuota, precio);
  $('d-moc').textContent  = usd(X);          $('dp-moc').textContent = pct(X, precio);
  $('d-pat2').textContent = usd(pat);        $('dp-pat').textContent = pct(pat, precio);
  $('d-due2').textContent = usd(due);        $('dp-due').textContent = pct(due, precio);
  $('d-rei2').textContent = usd(rei);        $('dp-rei').textContent = pct(rei, precio);
}

// ─── HISTORIAL ───────────────────────────────────────────────
function renderHistorial() {
  const filtradas = filtroMes === 'todos' ? ventas : ventas.filter(v => v.mesKey === filtroMes);
  const totP = filtradas.reduce((s,v) => s + v.cantidad, 0);
  const totF = filtradas.reduce((s,v) => s + v.precio * v.cantidad, 0);
  const totG = filtradas.reduce((s,v) => s + v.ganancia * v.cantidad, 0);

  $('tot-prendas').textContent  = totP;
  $('tot-factura').textContent  = usd(totF);
  $('tot-ganancia').textContent = usd(totG);

  const mesesUnicos = [...new Set(ventas.map(v => v.mesKey))].sort();
  const filtrosEl = $('filtros-mes');
  filtrosEl.innerHTML = '';
  if (ventas.length > 0) {
    const b = document.createElement('button');
    b.className = 'filter-btn' + (filtroMes==='todos'?' active':'');
    b.textContent = 'Todas';
    b.onclick = () => { filtroMes='todos'; renderHistorial(); };
    filtrosEl.appendChild(b);
    mesesUnicos.forEach(mk => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (filtroMes===mk?' active':'');
      btn.textContent = getMesLabel(mk);
      btn.onclick = () => { filtroMes=mk; renderHistorial(); };
      filtrosEl.appendChild(btn);
    });
  }

  const lista = $('lista-ventas');
  if (filtradas.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">🧵</div><p>Todavía no hay ventas registradas.<br>Calcula una prenda en <strong>👗 Por Prenda</strong> y haz clic en <em>Registrar Venta</em>.</p></div>';
    return;
  }
  lista.innerHTML = '';
  [...filtradas].reverse().forEach(v => {
    const fs = fmtFecha(v.fecha);
    const item = document.createElement('div');
    item.className = 'venta-item';
    item.innerHTML = `
      <div class="vi-icon">👗</div>
      <div class="vi-body">
        <div class="vi-top">
          <div class="vi-nombre">${v.nombre}${v.cantidad>1?' <span style="color:var(--magenta);font-size:11px">×'+v.cantidad+'</span>':''}</div>
          <div class="vi-precio">${usd(v.precio * v.cantidad)}</div>
        </div>
        <div class="vi-meta">${v.clienta?'👤 '+v.clienta+'  ':''}${v.whatsapp?'📱 '+v.whatsapp+'  ':''}📅 ${fs}</div>
        <div class="vi-tags">
          <span class="vi-tag">${v.cantidad} prenda${v.cantidad>1?'s':''}</span>
          <span class="vi-tag gray">Mat: ${usd(v.mat * v.cantidad)}</span>
          <span class="vi-tag green">Ganancia: ${usd(v.ganancia * v.cantidad)}</span>
        </div>
      </div>
      <button class="delete-btn" onclick="eliminarVenta(${v.id})" title="Eliminar">✕</button>`;
    lista.appendChild(item);
  });
}

// ─── PEDIDOS ─────────────────────────────────────────────────
function renderPedidos() {
  document.querySelectorAll('#filtros-pedidos .filter-btn').forEach((btn, i) => {
    btn.classList.toggle('active', filtroEstado === ['todos','en_proceso','entregada'][i]);
  });
  const filtradas = filtroEstado === 'todos' ? ventas : ventas.filter(v => (v.estado||'en_proceso') === filtroEstado);
  const lista = $('lista-pedidos');
  if (filtradas.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">📌</div><p>No hay pedidos aquí todavía.<br>Registra una venta en <strong>👗 Por Prenda</strong>.</p></div>';
    return;
  }
  lista.innerHTML = '';
  [...filtradas].reverse().forEach(v => {
    const estado = v.estado || 'en_proceso';
    const fs = fmtFecha(v.fecha);
    const item = document.createElement('div');
    item.className = 'pedido-item' + (estado==='entregada'?' entregada':'');
    item.innerHTML = `
      <div class="vi-icon">${estado==='entregada'?'✅':'📌'}</div>
      <div class="vi-body">
        <div class="vi-top">
          <div class="vi-nombre">${v.nombre}${v.cantidad>1?' <span style="font-size:11px;color:var(--magenta)">×'+v.cantidad+'</span>':''}</div>
          <div class="vi-precio">${usd(v.precio*v.cantidad)}</div>
        </div>
        <div class="vi-meta">${v.clienta?'👤 '+v.clienta+'  ':''}${v.whatsapp?'📱 '+v.whatsapp+'  ':''}📅 ${fs}</div>
        <div class="vi-tags" style="margin-top:8px">
          <span class="estado-badge ${estado==='entregada'?'entregada':'proceso'}">${estado==='entregada'?'✓ Entregada':'⏳ En proceso'}</span>
          <button class="toggle-estado" onclick="toggleEstado('${v.id}')">${estado==='entregada'?'Marcar en proceso':'Marcar entregada'}</button>
        </div>
      </div>`;
    lista.appendChild(item);
  });
}

// ─── CLIENTES ────────────────────────────────────────────────
function renderClientes() {
  const busqueda = ($('clientes-search').value || '').toLowerCase();

  const mapa = {};
  ventas.forEach(v => {
    if (!v.clienta) return;
    const key = v.clienta.toLowerCase();
    if (!mapa[key]) {
      mapa[key] = { nombre: v.clienta, whatsapp: v.whatsapp || '', prendas: 0, totalGastado: 0, ultimaCompra: v.fecha };
    }
    mapa[key].prendas      += v.cantidad;
    mapa[key].totalGastado += v.precio * v.cantidad;
    if (v.fecha > mapa[key].ultimaCompra) {
      mapa[key].ultimaCompra = v.fecha;
      if (v.whatsapp) mapa[key].whatsapp = v.whatsapp;
    }
  });

  let clientes = Object.values(mapa).sort((a,b) => b.totalGastado - a.totalGastado);
  if (busqueda) {
    clientes = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda) || c.whatsapp.includes(busqueda));
  }

  $('clientes-count').textContent = clientes.length + ' clienta' + (clientes.length !== 1 ? 's' : '');

  const lista = $('lista-clientes');
  if (clientes.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">👩‍🎨</div><p>' +
      (busqueda ? 'No se encontraron clientas con ese nombre o número.' : 'Cuando registres tu primera venta,<br>tus clientas aparecerán aquí automáticamente.') +
      '</p></div>';
    return;
  }

  lista.innerHTML = '';
  clientes.forEach(c => {
    const fs = fmtFecha(c.ultimaCompra);
    const waNum = c.whatsapp.replace(/[^0-9+]/g, '');
    const waLink = waNum ? `https://wa.me/${waNum.replace('+','')}` : '';
    const item = document.createElement('div');
    item.className = 'cliente-item';
    item.innerHTML = `
      <div class="cliente-avatar">${initials(c.nombre)}</div>
      <div class="cliente-body">
        <div class="cliente-nombre">${c.nombre}</div>
        <div class="cliente-meta">${c.whatsapp ? '📱 '+c.whatsapp+'  ' : ''}📅 Última compra: ${fs}</div>
        <div class="cliente-tags">
          <span class="vi-tag">${c.prendas} prenda${c.prendas!==1?'s':''}</span>
          <span class="vi-tag green">Total: ${usd(c.totalGastado)}</span>
        </div>
      </div>
      ${waLink ? `<a href="${waLink}" target="_blank" class="wa-btn">💬 WhatsApp</a>` : ''}`;
    lista.appendChild(item);
  });
}

// ─── PROYECCIÓN ──────────────────────────────────────────────
function renderProyeccion() {
  const cf = getCF();
  const contenedor = $('proy-content');

  if (ventas.length === 0) {
    contenedor.innerHTML = '<div class="empty-state"><div class="es-icon">📈</div><p>Registra tus primeras ventas y aquí verás el resumen mensual de tu taller.</p></div>';
    return;
  }

  const mesesUnicos = [...new Set(ventas.map(v => v.mesKey))].sort();
  contenedor.innerHTML = '';

  mesesUnicos.forEach(mk => {
    const vm        = ventas.filter(v => v.mesKey === mk);
    const prendas   = vm.reduce((s,v) => s + v.cantidad, 0);
    const factura   = vm.reduce((s,v) => s + v.precio * v.cantidad, 0);
    const costosVar = vm.reduce((s,v) => s + v.costoVar * v.cantidad, 0);
    const resultado = factura - costosVar - cf;
    const isPos     = resultado >= 0;

    const div = document.createElement('div');
    div.className = 'proy-mes';
    div.innerHTML = `
      <div class="proy-mes-header">
        <h3>📅 ${getMesLabel(mk)}</h3>
        <div class="pm-total ${isPos?'pos':'neg'}">${usd(resultado)}</div>
      </div>
      <div class="proy-stats">
        <div class="ps-item"><div class="ps-val">${prendas}</div><div class="ps-label">Prendas</div></div>
        <div class="ps-item"><div class="ps-val">${usd(factura)}</div><div class="ps-label">Facturación</div></div>
        <div class="ps-item"><div class="ps-val">${usd(costosVar)}</div><div class="ps-label">Costos variables</div></div>
        <div class="ps-item"><div class="ps-val">${usd(cf)}</div><div class="ps-label">Costos fijos</div></div>
        <div class="ps-item ${isPos?'green':'red'}" style="grid-column:1/-1">
          <div class="ps-val">${usd(resultado)}</div>
          <div class="ps-label">${isPos?'✅ Ganancia del mes':'⚠️ Pérdida del mes — necesitas vender más'}</div>
        </div>
      </div>`;
    contenedor.appendChild(div);
  });
}

// ─── MEDIDAS ─────────────────────────────────────────────────
function renderMedidas() {
  const busq = ($('medidas-search').value || '').toLowerCase();
  const filtradas = medidas.filter(m => !busq || (m.clienta||'').toLowerCase().includes(busq));
  const lista = $('lista-medidas');
  if (filtradas.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">📏</div><p>No hay medidas guardadas todavía.<br>Agrega la primera clienta arriba.</p></div>';
    return;
  }
  lista.innerHTML = '';
  filtradas.forEach(m => {
    const datosHTML = Object.entries(MED_LABELS)
      .filter(([col]) => m[col] != null && m[col] !== '')
      .map(([col, lbl]) => `<div class="med-dato"><div class="med-dato-label">${lbl}</div><div class="med-dato-val">${m[col]} cm</div></div>`)
      .join('');
    const card = document.createElement('div');
    card.className = 'medida-card';
    card.innerHTML = `
      <div class="medida-card-header">
        <div>
          <div class="medida-card-nombre">👤 ${m.clienta}</div>
          ${m.telefono?'<div style="font-size:11px;color:#888;margin-top:2px">📱 '+m.telefono+'</div>':''}
        </div>
        <div class="medida-card-actions">
          <button class="btn-editar" onclick="editarMedida(${m.id})">✏️ Editar</button>
          <button class="delete-btn" onclick="eliminarMedida(${m.id})" title="Eliminar">✕</button>
        </div>
      </div>
      ${datosHTML?'<div class="medidas-tabla">'+datosHTML+'</div>':''}
      ${m.notas?'<div style="font-size:11px;color:#888;margin-top:8px;padding:6px 8px;background:var(--amarillo);border-radius:6px">📝 '+m.notas+'</div>':''}`;
    lista.appendChild(card);
  });
}

// ─── TABS ────────────────────────────────────────────────────
function showTab(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  $('tab-'+id).classList.add('active');
  if (el) el.classList.add('active');
  if (id === 'invitaciones' && typeof renderInvitaciones === 'function') renderInvitaciones();
}
