// Módulo de invitaciones por token único.
// Schema esperado en `lista_blanca`: email, invite_token (uuid), invited_by, invited_at,
// expires_at, used_at, status ∈ {pending, accepted, expired, revoked}.

let _invites = [];

async function isCurrentUserAdmin() {
  if (!window._uid) return false;
  try {
    const { data } = await _supa.from('admins').select('user_id').eq('user_id', window._uid).maybeSingle();
    return !!data;
  } catch(e) { return false; }
}

function buildInviteLink(token, email) {
  const base = (window.__ENV && window.__ENV.APP_URL) || (window.location.origin + window.location.pathname);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

async function _notifyGHL(payload) {
  const url = window.__ENV && window.__ENV.GHL_INVITE_WEBHOOK;
  if (!url) return { skipped: true };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: true };
  } catch(e) {
    console.error('GHL webhook error:', e);
    return { error: e.message };
  }
}

async function loadInvites() {
  if (!window._isAdmin) return;
  try {
    const { data } = await _supa.from('lista_blanca').select('*').order('invited_at', { ascending: false });
    _invites = data || [];
  } catch(e) { _invites = []; }
}

async function createInvite() {
  const email = ($('invite-email').value || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    showToast('⚠️ Email inválido.'); return;
  }
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  try {
    // Si ya existe el email, regeneramos el token (reinvitación)
    const { data: existing } = await _supa.from('lista_blanca').select('id').eq('email', email).maybeSingle();
    let row;
    if (existing) {
      const { data, error } = await _supa.from('lista_blanca').update({
        invite_token: crypto.randomUUID(),
        invited_by: window._uid,
        invited_at: new Date().toISOString(),
        expires_at: expiresAt,
        used_at: null,
        status: 'pending',
      }).eq('id', existing.id).select('*').single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await _supa.from('lista_blanca').insert({
        email,
        invite_token: crypto.randomUUID(),
        invited_by: window._uid,
        invited_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'pending',
      }).select('*').single();
      if (error) throw error;
      row = data;
    }

    const link = buildInviteLink(row.invite_token, row.email);
    await _notifyGHL({
      event: 'invite.created',
      email: row.email,
      token: row.invite_token,
      link,
      expires_at: row.expires_at,
      invited_by: window._uid,
    });

    $('invite-email').value = '';
    showToast('✉️ Invitación enviada a ' + email);
    await loadInvites();
    renderInvitaciones();
  } catch(e) {
    console.error(e);
    showToast('⚠️ No se pudo crear la invitación.');
  }
}

async function resendInvite(id) {
  const inv = _invites.find(x => x.id === id);
  if (!inv) return;
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  try {
    const { data, error } = await _supa.from('lista_blanca').update({
      invite_token: crypto.randomUUID(),
      invited_at: new Date().toISOString(),
      expires_at: expiresAt,
      used_at: null,
      status: 'pending',
    }).eq('id', id).select('*').single();
    if (error) throw error;

    await _notifyGHL({
      event: 'invite.resent',
      email: data.email,
      token: data.invite_token,
      link: buildInviteLink(data.invite_token, data.email),
      expires_at: data.expires_at,
      invited_by: window._uid,
    });
    showToast('✉️ Reenviada a ' + data.email);
    await loadInvites();
    renderInvitaciones();
  } catch(e) { showToast('⚠️ Error al reenviar.'); }
}

async function revokeInvite(id) {
  if (!confirm('¿Revocar esta invitación? El usuario no podrá usar el link.')) return;
  try {
    const { error } = await _supa.from('lista_blanca').update({ status: 'revoked' }).eq('id', id);
    if (error) throw error;
    showToast('🚫 Invitación revocada');
    await loadInvites();
    renderInvitaciones();
  } catch(e) { showToast('⚠️ Error al revocar.'); }
}

async function copyInviteLink(id) {
  const inv = _invites.find(x => x.id === id);
  if (!inv || !inv.invite_token) return;
  const link = buildInviteLink(inv.invite_token, inv.email);
  try {
    await navigator.clipboard.writeText(link);
    showToast('📋 Link copiado');
  } catch(e) {
    prompt('Copia el link:', link);
  }
}

function _statusBadge(inv) {
  const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
  if (inv.status === 'accepted') return '<span class="badge">Aceptada</span>';
  if (inv.status === 'revoked')  return '<span class="badge gris">Revocada</span>';
  if (expired)                    return '<span class="badge red">Caducada</span>';
  return '<span class="badge amber">Pendiente</span>';
}

function renderInvitaciones() {
  const lista = $('lista-invitaciones');
  if (!lista) return;
  if (!window._isAdmin) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">🔒</div><p>Solo administradores pueden gestionar invitaciones.</p></div>';
    return;
  }
  if (_invites.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="es-icon">✉️</div><p>No hay invitaciones todavía.<br>Invita el primer correo arriba.</p></div>';
    return;
  }
  lista.innerHTML = '';
  _invites.forEach(inv => {
    const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
    const cls = inv.status === 'accepted' ? 'accepted'
              : inv.status === 'revoked'  ? 'revoked'
              : expired                    ? 'expired' : '';
    const fechaInv = inv.invited_at ? fmtFecha(inv.invited_at) : '—';
    const fechaExp = inv.expires_at ? fmtFecha(inv.expires_at) : '—';
    const item = document.createElement('div');
    item.className = 'invite-item ' + cls;
    const isPending = inv.status !== 'accepted' && inv.status !== 'revoked';
    item.innerHTML = `
      <div class="ii-body">
        <div class="ii-email">${inv.email} ${_statusBadge(inv)}</div>
        <div class="ii-meta">📅 Invitada: ${fechaInv} · ⏳ Expira: ${fechaExp}${inv.used_at?' · ✅ Usada: '+fmtFecha(inv.used_at):''}</div>
      </div>
      <div class="ii-actions">
        ${isPending ? `<button class="btn-mini" onclick="copyInviteLink('${inv.id}')">📋 Link</button>` : ''}
        ${isPending ? `<button class="btn-mini" onclick="resendInvite('${inv.id}')">✉️ Reenviar</button>` : ''}
        ${inv.status !== 'revoked' ? `<button class="btn-mini danger" onclick="revokeInvite('${inv.id}')">🚫 Revocar</button>` : ''}
      </div>`;
    lista.appendChild(item);
  });
}
