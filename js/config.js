// Cliente Supabase compartido por todos los módulos. window.__ENV se carga desde env.config.js.
const _supa = supabase.createClient(window.__ENV.SUPABASE_URL, window.__ENV.SUPABASE_ANON_KEY);
window._supa = _supa;
