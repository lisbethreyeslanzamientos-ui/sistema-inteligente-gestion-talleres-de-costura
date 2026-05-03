# Auditoría Supabase ↔ GHL

## Estado del sistema

| Área | Estado actual | Riesgo | Acción tomada |
|------|--------------|--------|---------------|
| Credenciales | Antes hardcoded en index.html líneas 921–922 | Bajo (anon key es pública por diseño) pero imposible rotar | Movidas a `js/env.config.js` (gitignored). En GHL se inyectan inline. |
| Tabla `lista_blanca` | Solo campo `email` | Sin expiración, sin trazabilidad, spam posible | Extendida en `0001_invites.sql` con token, expiry, status |
| Auth | Password puro, sin confirmación de email | Medio | Documentado. Activar email confirmation en Supabase si se desea |
| Webhook GHL → Supabase | Formulario GHL → workflow → insert en `lista_blanca` | Sin validación de token | Reemplazado por invitaciones con token desde el sistema |
| RLS | Pendiente verificación | Alto si está abierto | Ver sección "Políticas RLS" abajo |
| Backups | Default Supabase (PITR en plan Pro) | OK | Sin cambios necesarios |

---

## Tablas en uso

| Tabla | Propósito |
|-------|-----------|
| `costos_fijos` | Costos fijos mensuales por usuario |
| `ventas` | Registro de prendas vendidas |
| `medidas` | Medidas de clientas por usuario |
| `lista_blanca` | Control de acceso + invitaciones |
| `admins` | Usuarios con privilegios de administrador (nueva) |

---

## Políticas RLS aplicadas en migración 0001

### `lista_blanca`
- `admins_all`: admins tienen acceso completo (SELECT/INSERT/UPDATE/DELETE)
- `public_read_own_invite`: cualquier visitante puede leer para validar su token durante signup

### `admins`
- `self_read`: cada admin puede leer solo su propia fila (necesario para `isCurrentUserAdmin()`)
- INSERT/UPDATE/DELETE: solo desde SQL o service-role (sin endpoint público)

---

## Queries de verificación

```sql
-- Verificar RLS activo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Ver políticas por tabla
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar admins registrados
SELECT a.user_id, u.email, a.created_at
FROM admins a
JOIN auth.users u ON u.id = a.user_id;

-- Estado de invitaciones
SELECT email, status, expires_at, used_at,
       CASE WHEN expires_at < now() THEN 'CADUCADA' ELSE '' END AS alerta
FROM lista_blanca
ORDER BY invited_at DESC NULLS LAST;
```

---

## Agregar primer admin

Ejecutar en el SQL Editor de Supabase (requiere conocer el `user_id`):

```sql
-- Obtener user_id por email
SELECT id, email FROM auth.users WHERE email = 'cinthia@example.com';

-- Insertar admin
INSERT INTO admins (user_id) VALUES ('<uuid-del-usuario>');
```

---

## Pendientes / Recomendaciones

- [ ] Verificar que `costos_fijos`, `ventas` y `medidas` tienen RLS con política `user_id = auth.uid()`
- [ ] Considerar activar **Email Confirmation** en Supabase Auth para mayor seguridad
- [ ] Configurar secrets en GitHub: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GHL_API_KEY`, `GHL_PAGE_ID`, `GHL_INVITE_WEBHOOK`, `APP_URL`
- [ ] Configurar webhook en GHL que reciba los eventos de invitación y envíe el email con el link
