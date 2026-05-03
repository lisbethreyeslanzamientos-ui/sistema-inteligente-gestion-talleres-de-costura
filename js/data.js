// Estado global de datos
let ventas = [];
let medidas = [];
let filtroMes = 'todos';
let filtroEstado = 'todos';

const MED_CAMPOS = [
  ['busto','contorno_busto'],['cintura','contorno_cintura'],['cadera','contorno_cadera'],
  ['largo-talle','largo_talle'],['ancho-espalda','ancho_espalda'],['largo-blusa','largo_blusa'],
  ['cuello','contorno_cuello'],['largo-manga','largo_manga'],['escote','escote'],
  ['hombros','caida_hombros'],['sisa','sisa'],['tiro-del','tiro_delantero'],
  ['tiro-tras','tiro_trasero'],['largo-pant','largo_pantalon'],['largo-vest','largo_vestido'],
  ['largo-blaz','largo_blazer'],['largo-fald','largo_falda'],
];
const MED_LABELS = {
  contorno_busto:'Busto', contorno_cintura:'Cintura', contorno_cadera:'Cadera',
  largo_talle:'Talle', ancho_espalda:'Espalda', largo_blusa:'Blusa',
  contorno_cuello:'Cuello', largo_manga:'Manga', escote:'Escote',
  caida_hombros:'Hombros', sisa:'Sisa', tiro_delantero:'Tiro del.',
  tiro_trasero:'Tiro tras.', largo_pantalon:'Pantalón', largo_vestido:'Vestido',
  largo_blazer:'Blazer', largo_falda:'Falda',
};

// ─── COSTOS FIJOS ─────────────────────────────────────────────
let _cfSaveTimer = null;
function saveConfig() {
  clearTimeout(_cfSaveTimer);
  _cfSaveTimer = setTimeout(_doSaveConfig, 800);
}
async function _doSaveConfig() {
  if (!window._uid) return;
  clearTimeout(_cfSaveTimer);
  const row = { user_id: window._uid };
  for (let i=1;i<=10;i++) row['cf'+i] = gv('cf'+i);
  row['prendas_mes'] = gv('prendas-mes');
  try {
    await _supa.from('costos_fijos').upsert(row, { onConflict: 'user_id' });
  } catch(e) { console.error('saveConfig:', e); }
}
async function loadConfig() {
  if (!window._uid) return;
  try {
    const { data } = await _supa.from('costos_fijos').select('*').eq('user_id', window._uid).maybeSingle();
    if (data) {
      for (let i=1;i<=10;i++) if (data['cf'+i] !== undefined && data['cf'+i] !== null) $('cf'+i).value = data['cf'+i];
      if (data['prendas_mes']) $('prendas-mes').value = data['prendas_mes'];
    }
  } catch(e) { console.error('loadConfig:', e); }
}

// ─── VENTAS ──────────────────────────────────────────────────
async function loadVentas() {
  if (!window._uid) { ventas = []; return; }
  try {
    const { data } = await _supa.from('ventas').select('*').eq('user_id', window._uid).order('fecha', { ascending: true });
    ventas = (data || []).map(r => ({
      id: r.id,
      fecha: r.fecha,
      mesKey: r.mes_key,
      nombre: r.nombre || '',
      clienta: r.clienta || '',
      whatsapp: r.whatsapp || '',
      cantidad: r.cantidad || 1,
      mat: Number(r.mat) || 0,
      cuotaCF: Number(r.cuota_cf) || 0,
      costoVar: Number(r.costo_var) || 0,
      ganancia: Number(r.ganancia) || 0,
      precio: Number(r.precio) || 0,
      estado: r.estado || 'en_proceso',
    }));
  } catch(e) { ventas = []; }
}

async function registrarVenta() {
  if (!window._uid) { showToast('⚠️ Debes iniciar sesión.'); return; }
  try {
    const cf           = getCF();
    const pm           = Math.max(gv('prendas-mes'), 1);
    const cuota        = cf / pm;
    const mat          = [1,2,3,4,5,6,7].reduce((s,i) => s + gv('m'+i), 0);
    const X            = gv('mo-cos');
    const subtotalMano = X * 2;
    const subtotalGan  = X * 3;
    const precio       = mat + cuota + subtotalMano + subtotalGan;
    const ganancia     = subtotalGan;
    const cant         = Math.max(parseInt($('r-cant').value) || 1, 1);
    const costoVar     = mat + subtotalMano;
    const fecha        = new Date().toISOString();
    const mesKey       = getMesKey(new Date());
    const nombre       = $('nombre-prenda').value || 'Prenda';
    const clienta      = $('r-clienta').value.trim();
    const whatsapp     = $('r-wa').value.trim();

    const { data, error } = await _supa.from('ventas').insert({
      user_id: window._uid,
      fecha, mes_key: mesKey, nombre, clienta, whatsapp,
      cantidad: cant, mat, cuota_cf: cuota, costo_var: costoVar, ganancia, precio,
      estado: 'en_proceso',
    }).select('id').single();
    if (error) throw error;

    ventas.push({ id: data.id, fecha, mesKey, nombre, clienta, whatsapp, cantidad: cant, mat, cuotaCF: cuota, costoVar, ganancia, precio, estado: 'en_proceso' });
    $('r-clienta').value = '';
    $('r-wa').value = '';
    $('r-cant').value = '1';
    filtroMes = 'todos';
    showToast('✅ Venta registrada — ' + cant + ' ' + (cant>1?'prendas':'prenda'));
    renderHistorial();
    renderPedidos();
    renderClientes();
    renderProyeccion();
  } catch(e) {
    showToast('⚠️ Error al registrar. Intenta de nuevo.');
  }
}

async function eliminarVenta(id) {
  try {
    const { error } = await _supa.from('ventas').delete().eq('id', id).eq('user_id', window._uid);
    if (error) throw error;
    ventas = ventas.filter(v => v.id !== id);
    renderHistorial();
    renderPedidos();
    renderClientes();
    renderProyeccion();
  } catch(e) {
    showToast('⚠️ Error al eliminar. Intenta de nuevo.');
  }
}

// ─── PEDIDOS (estado local por usuario) ───────────────────────
function _estadoKey() { return 'ca_estados_' + (window._uid || 'guest'); }
function _getEstados() { try { return JSON.parse(localStorage.getItem(_estadoKey()) || '{}'); } catch(e) { return {}; } }
function _setEstados(obj) { try { localStorage.setItem(_estadoKey(), JSON.stringify(obj)); } catch(e) {} }
function _mergeEstados() {
  const est = _getEstados();
  ventas.forEach(v => { v.estado = est[String(v.id)] || v.estado || 'en_proceso'; });
}
function toggleEstado(id) {
  const v = ventas.find(x => String(x.id) === String(id));
  if (!v) return;
  const nuevo = (v.estado || 'en_proceso') === 'entregada' ? 'en_proceso' : 'entregada';
  v.estado = nuevo;
  const est = _getEstados();
  est[String(id)] = nuevo;
  _setEstados(est);
  renderPedidos();
  showToast(nuevo === 'entregada' ? '✅ Marcada como entregada' : '📌 Marcada como en proceso');
}

// ─── MEDIDAS ─────────────────────────────────────────────────
async function loadMedidas() {
  if (!window._uid) { medidas = []; return; }
  try {
    const { data } = await _supa.from('medidas').select('*').eq('user_id', window._uid).order('clienta', { ascending: true });
    medidas = data || [];
  } catch(e) { medidas = []; }
}

async function guardarMedida() {
  const nombre = $('med-nombre').value.trim();
  if (!nombre) { showToast('⚠️ Escribe el nombre de la clienta.'); return; }
  if (!window._uid) return;
  const row = { user_id: window._uid, clienta: nombre, telefono: $('med-telefono').value.trim(), notas: $('med-notas').value.trim() };
  MED_CAMPOS.forEach(([htmlId, col]) => { const v = parseFloat($('med-'+htmlId).value); row[col] = isNaN(v) ? null : v; });
  try {
    const editId = $('med-edit-id').value;
    if (editId) {
      const { error } = await _supa.from('medidas').update(row).eq('id', editId).eq('user_id', window._uid);
      if (error) throw error;
      const idx = medidas.findIndex(m => m.id == editId);
      if (idx >= 0) medidas[idx] = { ...medidas[idx], ...row };
      showToast('✅ Medidas actualizadas');
    } else {
      const { data, error } = await _supa.from('medidas').insert(row).select('id').single();
      if (error) throw error;
      medidas.push({ ...row, id: data.id });
      showToast('✅ Medidas guardadas');
    }
    limpiarFormMedida();
    renderMedidas();
  } catch(e) { showToast('⚠️ Error al guardar. Intenta de nuevo.'); }
}

function editarMedida(id) {
  const m = medidas.find(x => x.id === id);
  if (!m) return;
  $('med-nombre').value = m.clienta || '';
  $('med-telefono').value = m.telefono || '';
  $('med-notas').value = m.notas || '';
  MED_CAMPOS.forEach(([htmlId, col]) => { $('med-'+htmlId).value = m[col] != null ? m[col] : ''; });
  $('med-edit-id').value = id;
  $('medida-form-titulo').textContent = 'Editar — ' + m.clienta;
  $('btn-cancelar-med').style.display = 'block';
  document.getElementById('tab-medidas').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicionMedida() { limpiarFormMedida(); }

function limpiarFormMedida() {
  $('med-nombre').value = '';
  $('med-telefono').value = '';
  $('med-notas').value = '';
  MED_CAMPOS.forEach(([htmlId]) => { $('med-'+htmlId).value = ''; });
  $('med-edit-id').value = '';
  $('medida-form-titulo').textContent = 'Nueva clienta';
  $('btn-cancelar-med').style.display = 'none';
}

async function eliminarMedida(id) {
  if (!confirm('¿Eliminar las medidas de esta clienta?')) return;
  try {
    const { error } = await _supa.from('medidas').delete().eq('id', id).eq('user_id', window._uid);
    if (error) throw error;
    medidas = medidas.filter(m => m.id !== id);
    renderMedidas();
    showToast('🗑️ Medidas eliminadas');
  } catch(e) { showToast('⚠️ Error al eliminar.'); }
}
