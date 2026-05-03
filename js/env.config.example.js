// Copiar este archivo a env.config.js (gitignored) y completar con credenciales reales.
// La anon key es pública por diseño en Supabase, pero queda fuera del repo para poder rotarla
// sin tener que rebuildear, y para no subir credenciales por accidente a otros entornos.
window.__ENV = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
  // Webhook de GHL que recibe el evento de invitación. Vacío = no enviar email.
  GHL_INVITE_WEBHOOK: '',
  // URL pública donde se hospeda la app. Se usa para construir el link de invitación.
  APP_URL: window.location.origin + window.location.pathname,
};
