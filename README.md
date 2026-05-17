# Sistema Inteligente Gestión Talleres de Costura

App web para talleres de costura — calculadora de precios, registro de ventas, gestión de clientas y medidas. Desplegada en GoHighLevel.

## Estructura del proyecto

```
/
├── index.html                  # Markup + links a CSS/JS
├── css/
│   └── styles.css              # Todo el CSS
├── js/
│   ├── env.config.js           # ⚠️ GITIGNORED — credenciales reales
│   ├── env.config.example.js   # Plantilla de credenciales
│   ├── config.js               # Supabase client
│   ├── helpers.js              # Utilidades ($, usd, pct, toast…)
│   ├── data.js                 # Estado global + funciones de datos
│   ├── views.js                # Funciones de render de UI
│   ├── auth.js                 # Login, signup, recovery
│   ├── invites.js              # Módulo de invitaciones por token
│   └── app.js                  # Init, auth state listener
├── scripts/
│   └── build.js                # Genera dist/index.html (bundle para GHL)
├── supabase/
│   └── migrations/
│       └── 0001_invites.sql    # Extiende lista_blanca + crea admins + RLS
├── docs/
│   └── audit.md                # Auditoría Supabase ↔ GHL
└── .github/workflows/
    └── deploy-ghl.yml          # Auto-deploy a GHL en push a main
```

## Setup local

1. Copiar credenciales:
   ```bash
   cp js/env.config.example.js js/env.config.js
   # Editar js/env.config.js con tus credenciales de Supabase
   ```

2. Servir localmente:
   ```bash
   python -m http.server 8080
   # Abrir http://localhost:8080
   ```

## Build para GoHighLevel

```bash
node scripts/build.js
# Genera dist/index.html — subir este archivo a GHL
```

## Deploy automático (GitHub Actions)

Configura estos secrets en el repositorio de GitHub:

| Secret | Descripción |
|--------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `GHL_INVITE_WEBHOOK` | URL del webhook de GHL para envío de emails de invitación |
| `GHL_API_KEY` | API key de GoHighLevel |
| `GHL_PAGE_ID` | ID de la página en GHL donde se despliega el app |
| `APP_URL` | URL pública del app (para construir links de invitación) |

Cada push a `main` ejecuta el build y sube `dist/index.html` a GHL automáticamente.

## Migración de base de datos

Aplicar en el SQL Editor de Supabase:

```bash
# Pegar el contenido de:
supabase/migrations/0001_invites.sql
```

Luego agregar el primer admin:
```sql
INSERT INTO admins (user_id)
SELECT id FROM auth.users WHERE email = 'tu-email-admin@example.com';
```

## Módulo de invitaciones

- Solo los admins ven la pestaña **✉️ Invitaciones**
- El admin invita un email → se genera un token único con 7 días de vida
- GHL recibe el webhook y envía el email con el link `?token=...&email=...`
- La invitada abre el link → el email queda pre-rellenado y bloqueado → crea su contraseña
- El token se marca como `accepted` al completar el registro

Ver `docs/audit.md` para detalles de RLS y queries de verificación.
