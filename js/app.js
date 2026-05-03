// Detección temprana de URL: token de invitación o flujo de recovery.
(function() {
  const hash = new URLSearchParams(window.location.hash.replace('#',''));
  const search = new URLSearchParams(window.location.search);
  if (hash.get('type') === 'recovery' || search.get('type') === 'recovery') {
    isRecoveryMode = true;
    $('login-screen').style.display = 'flex';
    $('app-content').style.display = 'none';
  }
  const token = search.get('token');
  const email = search.get('email');
  if (token && email) {
    _pendingInvite = { token, email };
  }
})();

async function initApp() {
  try {
    window._isAdmin = await isCurrentUserAdmin();
    document.querySelectorAll('.tab.admin-only').forEach(t => t.classList.toggle('is-admin', !!window._isAdmin));
    await Promise.all([loadConfig(), loadVentas(), loadMedidas()]);
    if (window._isAdmin) await loadInvites();
    _mergeEstados();
    calcAll();
    renderHistorial();
    renderPedidos();
    renderClientes();
    renderProyeccion();
    renderMedidas();
    if (window._isAdmin) renderInvitaciones();
  } catch(e) { console.error('Error al inicializar:', e); }
}

_supa.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    isRecoveryMode = true;
    $('login-screen').style.display = 'flex';
    $('app-content').style.display = 'none';
    showRecovery();
  } else if (session && !isRecoveryMode) {
    window._uid = session.user.id;
    $('login-screen').style.display = 'none';
    $('app-content').style.display = 'block';
    if (!window._appInitialized) {
      window._appInitialized = true;
      initApp();
    }
  } else if (!session && !isRecoveryMode) {
    $('login-screen').style.display = 'flex';
    $('app-content').style.display = 'none';
    // Si hay token en URL, mostrar form de signup pre-rellenado
    if (_pendingInvite) {
      showSignup();
      $('signup-email').value = _pendingInvite.email;
      $('signup-email').disabled = true;
      showAuthMsg('Tienes una invitación. Crea tu contraseña para registrarte.', true);
    }
  }
});

// Copiar logo del header al login
window.addEventListener('DOMContentLoaded', () => {
  const hdr = document.querySelector('.logo-img');
  const lgn = $('login-logo');
  if (hdr && lgn) lgn.src = hdr.src;
});
