const $ = id => document.getElementById(id);
const usd = v => (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = (p, t) => t ? (p/t*100).toFixed(1)+'%' : '-';
const gv  = id => parseFloat($(id).value) || 0;

function getMesKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function getMesLabel(key) {
  const [y,m] = key.split('-');
  const n = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return n[parseInt(m)-1] + ' ' + y;
}
function getCF() {
  return [1,2,3,4,5,6,7,8,9,10].reduce((s,i) => s + gv('cf'+i), 0);
}
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
}
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'numeric'});
}
