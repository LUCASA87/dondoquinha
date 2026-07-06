-- Chaves de acesso rápido (digital / Face ID) por dispositivo
CREATE TABLE IF NOT EXISTS app_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_app_passkeys" ON app_passkeys;
CREATE POLICY "anon_all_app_passkeys"
  ON app_passkeys FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
