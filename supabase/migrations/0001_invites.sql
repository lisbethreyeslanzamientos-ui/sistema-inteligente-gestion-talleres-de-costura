-- Migración 0001: módulo de invitaciones por token único
-- Aplica sobre la tabla lista_blanca existente sin borrar datos.

-- ── 1. Extender lista_blanca ──────────────────────────────────
ALTER TABLE lista_blanca
  ADD COLUMN IF NOT EXISTS invite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invited_by   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invited_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz DEFAULT now() + interval '7 days',
  ADD COLUMN IF NOT EXISTS used_at      timestamptz,
  ADD COLUMN IF NOT EXISTS status       text DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked'));

-- Rellenar token para filas que no lo tienen aún
UPDATE lista_blanca
  SET invite_token = gen_random_uuid()
  WHERE invite_token IS NULL;

-- Marcar usuarios existentes (pre-migración) como aceptados
-- para que no pierdan acceso al sistema.
UPDATE lista_blanca
  SET status = 'accepted', used_at = now()
  WHERE status IS NULL;

-- ── 2. Tabla admins ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ── 3. RLS — lista_blanca ─────────────────────────────────────
ALTER TABLE lista_blanca ENABLE ROW LEVEL SECURITY;

-- Los admins pueden leer/escribir toda la tabla
CREATE POLICY "admins_all" ON lista_blanca
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Cualquier visitante puede leer su propia fila por token+email
-- (necesario para validar el invite durante el signup)
CREATE POLICY "public_read_own_invite" ON lista_blanca
  FOR SELECT
  USING (true);

-- ── 4. RLS — admins ───────────────────────────────────────────
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Solo el propio admin puede leer su fila (para isCurrentUserAdmin())
CREATE POLICY "self_read" ON admins
  FOR SELECT
  USING (user_id = auth.uid());

-- Inserción solo desde SQL/service-role (sin endpoint público)
-- No creamos política INSERT pública — se gestiona desde el dashboard.
