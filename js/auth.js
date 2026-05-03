let authMode = 'login';
let isRecoveryMode = false;
// Se llena cuando la URL trae ?token=... — usado para forzar el email del invitado.
let _pendingInvite = null;

function showAuthMsg(msg, ok) {
  const el = $('auth-msg');
  el.textContent = msg; el.style.display = 'block';
  el.style.background = ok ? '#D4F5E2' : '#FEE2E2';
  el.style.color = ok ? '#1E7A45' : '#DC2626';
}
function clearAuthMsg() { $('auth-msg').style.display = 'none'; }

function _hideAllAuthForms() {
  ['form-login','form-signup','form-forgot','form-recovery'].forEach(id => $(id).style.display = 'none');
}
function showLogin()    { _hideAllAuthForms(); $('form-login').style.display='block';    $('auth-title').textContent='Iniciar sesión';      clearAuthMsg(); }
function showSignup()   { _hideAllAuthForms(); $('form-signup').style.display='block';   $('auth-title').textContent='Registrarse';        clearAuthMsg(); }
function showForgot()   { _hideAllAuthForms(); $('form-forgot').style.display='block';   $('auth-title').textContent='Recuperar contraseña'; clearAuthMsg(); }
function showRecovery() { _hideAllAuthForms(); $('form-recovery').style.display='block'; $('auth-title').textContent='Nueva contraseña';     clearAuthMsg(); }

async function handleLogin() {
  const email = $('auth-email').value.trim();
  const pass  = $('auth-password').value;
  if (!email || !pass) { showAuthMsg('Completa todos los campos.', false); return; }
  try {
    const { error } = await _supa.auth.signInWithPassword({ email, password: pass });
    if (error) showAuthMsg(authErrMsg(error.message), false);
  } catch(e) { showAuthMsg('Error de conexión. Intenta de nuevo.', false); }
}

async function handleSignup() {
  const email   = $('signup-email').value.trim();
  const pass    = $('signup-password').value;
  const confirm = $('signup-confirm').value;
  if (!email || !pass) { showAuthMsg('Completa todos los campos.', false); return; }
  if (pass.length < 6)  { showAuthMsg('La contraseña debe tener mínimo 6 caracteres.', false); return; }
  if (pass !== confirm) { showAuthMsg('Las contraseñas no coinciden.', false); return; }
  try {
    // Validar invitación: si vino token en la URL, debe coincidir con el email + estar pendiente y vigente.
    // Si no vino token, fallback a la lista_blanca legacy (filas migradas como 'accepted' siguen permitiendo
    // el camino antiguo, pero filas nuevas creadas vía /invitar requerirán token sí o sí).
    const tokenFromUrl = _pendingInvite && _pendingInvite.token;
    let inviteRow = null;

    if (tokenFromUrl) {
      const { data, error } = await _supa.from('lista_blanca')
        .select('*').eq('invite_token', tokenFromUrl).eq('email', email).maybeSingle();
      if (error || !data) { showAuthMsg('Token inválido o el email no coincide con la invitación.', false); return; }
      if (data.status === 'revoked')  { showAuthMsg('Esta invitación fue revocada.', false); return; }
      if (data.status === 'accepted') { showAuthMsg('Esta invitación ya fue usada. Inicia sesión.', false); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        showAuthMsg('La invitación caducó. Solicita una nueva.', false); return;
      }
      inviteRow = data;
    } else {
      const { data, error } = await _supa.from('lista_blanca').select('*').eq('email', email).maybeSingle();
      if (error || !data) {
        showAuthMsg('Tu correo no está autorizado. Solicita una invitación.', false); return;
      }
      if (data.status && data.status !== 'accepted' && data.status !== 'pending') {
        showAuthMsg('Tu invitación no está activa. Solicita una nueva.', false); return;
      }
      inviteRow = data;
    }

    const { error: signUpError } = await _supa.auth.signUp({ email, password: pass });
    if (signUpError) { showAuthMsg(authErrMsg(signUpError.message), false); return; }

    // Marcar la invitación como aceptada (best-effort: si RLS lo bloquea, el admin puede ajustar luego).
    if (inviteRow && inviteRow.id) {
      await _supa.from('lista_blanca')
        .update({ status: 'accepted', used_at: new Date().toISOString() })
        .eq('id', inviteRow.id);
    }

    showAuthMsg('¡Cuenta creada! Ya puedes iniciar sesión.', true);
  } catch(e) { showAuthMsg('Error de conexión. Intenta de nuevo.', false); }
}

async function handleForgotPassword() {
  const email = $('forgot-email').value.trim();
  if (!email) { showAuthMsg('Ingresa tu email.', false); return; }
  try {
    const { error } = await _supa.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    showAuthMsg(error ? authErrMsg(error.message) : '¡Enviado! Revisa tu email.', !error);
  } catch(e) { showAuthMsg('Error de conexión. Intenta de nuevo.', false); }
}

async function handleUpdatePassword() {
  const p1 = $('new-password').value;
  const p2 = $('confirm-password').value;
  if (p1.length < 6) { showAuthMsg('Mínimo 6 caracteres.', false); return; }
  if (p1 !== p2) { showAuthMsg('Las contraseñas no coinciden.', false); return; }
  try {
    const { error } = await _supa.auth.updateUser({ password: p1 });
    if (error) {
      showAuthMsg(authErrMsg(error.message), false);
    } else {
      isRecoveryMode = false;
      showAuthMsg('¡Contraseña actualizada! Ya puedes iniciar sesión.', true);
      setTimeout(() => { showLogin(); }, 2000);
    }
  } catch(e) { showAuthMsg('Error. Intenta de nuevo.', false); }
}

async function handleLogout() {
  if (isRecoveryMode) return;
  await _doSaveConfig();
  window._appInitialized = false;
  window._uid = null;
  window._isAdmin = false;
  ventas = [];
  medidas = [];
  for (let i=1;i<=10;i++) $('cf'+i).value = '0';
  $('prendas-mes').value = '30';
  calcAll();
  renderHistorial();
  await _supa.auth.signOut();
}

function authErrMsg(m) {
  if (m.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('Email not confirmed'))       return 'Confirma tu email antes de entrar.';
  if (m.includes('User already registered'))   return 'Ya existe una cuenta con ese email.';
  if (m.includes('Password should be'))        return 'La contraseña debe tener mínimo 6 caracteres.';
  return 'Error: ' + m;
}
