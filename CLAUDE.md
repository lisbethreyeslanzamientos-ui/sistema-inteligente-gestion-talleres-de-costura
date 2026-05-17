# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Single-file vanilla JS web app for sewing workshop management (price calculator, sales log, client directory, measurements, projections). Deployed to GoHighLevel (GHL), which only accepts one HTML file — hence the build step that bundles everything.

## Commands

```bash
# Serve locally (no build needed for dev)
python -m http.server 8080
# → open http://localhost:8080

# Build for GoHighLevel (inlines all CSS + JS into dist/index.html)
node scripts/build.js

# First-time setup — copy and fill in credentials
cp js/env.config.example.js js/env.config.js
# Edit js/env.config.js with real Supabase URL, anon key, GHL webhook, APP_URL
```

There are no tests and no linter configured.

## Architecture

**No framework, no bundler, no npm.** Everything runs as plain `<script>` tags loaded in strict order. Script load order in `index.html` (and replicated in `scripts/build.js`) is:

1. `env.config.js` — sets `window.__ENV` with credentials (gitignored; injected by CI)
2. `config.js` — creates `window._supa` (Supabase client, shared by all modules)
3. `helpers.js` — global utilities: `$()` (getElementById), `gv()` (parseFloat input), `usd()`, `pct()`, `showToast()`, `getMesKey()`, `getCF()`
4. `data.js` — global state (`ventas[]`, `medidas[]`) + all Supabase CRUD functions
5. `views.js` — all render functions (`calcAll`, `renderHistorial`, `renderClientes`, `renderProyeccion`, `renderMedidas`, `renderPedidos`) and `showTab()`
6. `auth.js` — login/signup/recovery/logout logic, `_pendingInvite` global
7. `invites.js` — admin invite management, `isCurrentUserAdmin()` (checks `perfiles.es_admin`)
8. `app.js` — `_supa.auth.onAuthStateChange` listener + `initApp()`, URL token detection on load

**Order matters.** Every module accesses globals defined by earlier modules. Don't reorder.

## Price formula

The core calculation in `views.js:calcAll()` and `data.js:registrarVenta()`:
- `X` = costurera labor input (`#mo-cos`)
- Mano de obra = `2X` (costurera `X` + patronaje/corte `X`)
- Ganancia taller = `3X` (dueña `2X` + reinversión `X`)
- **Precio = Materiales + Cuota CF + 2X + 3X**
- Ganancia neta = `3X`

## Supabase tables

| Table | Purpose |
|-------|---------|
| `costos_fijos` | One row per user, `cf1`–`cf10` + `prendas_mes`. Upserted on change. |
| `ventas` | Sales records with `user_id`, pricing snapshot, `estado` (en_proceso/entregada) |
| `medidas` | Client measurements, 17 body measurement columns |
| `lista_blanca` | Invite system: `email`, `invite_token`, `status` (pending/accepted/expired/revoked), `expires_at` |
| `admins` | Legacy admin table (deprecated in favor of `perfiles`) |
| `perfiles` | `es_admin` boolean — checked by `isCurrentUserAdmin()` |

Order states (`en_proceso`/`entregada`) are stored in `localStorage` per user (key: `ca_estados_<uid>`) and merged over the Supabase `estado` column at init via `_mergeEstados()`.

## Build & deploy

`scripts/build.js` reads `index.html`, inlines `css/styles.css` as `<style>`, concatenates all JS files in order into a single `<script>`, and writes `dist/index.html`. `env.config.js` is **not** bundled — in GHL it must be injected as a separate inline block before the app script.

CI (`.github/workflows/deploy-ghl.yml`) triggers on push to `main`: injects credentials from GitHub Secrets → runs build → uploads `dist/index.html` to GHL via their REST API.

## Invitation flow

Admin invites email → token UUID inserted into `lista_blanca` with 7-day expiry → GHL webhook called with `{ event, email, token, link }` to send the email → invitee opens `?token=...&email=...` URL → `app.js` detects params, sets `_pendingInvite`, pre-fills + locks the email field → `auth.js:handleSignup()` validates token against `lista_blanca` before creating the Supabase auth user → marks row `status = 'accepted'`.
