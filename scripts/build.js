#!/usr/bin/env node
// Concatena css/styles.css + todos los js/*.js en un único dist/index.html
// listo para subir a GoHighLevel (que solo acepta un archivo HTML).

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);

// ── Leer HTML base ────────────────────────────────────────────
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ── Logo inline (para que GHL reciba un HTML self-contained) ─────
const logoPath = path.join(ROOT, 'assets', 'logo.jpg');
if (fs.existsSync(logoPath)) {
  const logoB64 = fs.readFileSync(logoPath).toString('base64');
  html = html.replace(
    'src="assets/logo.jpg"',
    `src="data:image/jpeg;base64,${logoB64}"`
  );
}

// ── CSS inline ────────────────────────────────────────────────
const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
html = html.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  `<style>\n${css}\n</style>`
);

// ── JS inline (en orden) ──────────────────────────────────────
// env.config.js se inyecta externamente en GHL; el ejemplo queda comentado.
const jsFiles = [
  // 'js/env.config.js',  // ← En GHL se inyecta como bloque inline separado
  'js/config.js',
  'js/helpers.js',
  'js/data.js',
  'js/views.js',
  'js/auth.js',
  'js/invites.js',
  'js/app.js',
];

let combinedJs = jsFiles
  .map(f => `// ===== ${f} =====\n` + fs.readFileSync(path.join(ROOT, f), 'utf8'))
  .join('\n\n');

// Eliminar todos los <script src="js/..."> (env.config.js se inyecta aparte en GHL)
// e inyectar el bundle justo antes de </body>
html = html.replace(/<script src="js\/[^"]+"><\/script>\n?/g, '');
html = html.replace('</body>', `<script>\n${combinedJs}\n</script>\n</body>`);

// ── Escribir dist/index.html ──────────────────────────────────
const outPath = path.join(DIST, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✅  Build completo → dist/index.html (${Math.round(html.length / 1024)} KB)`);
