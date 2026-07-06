-- Credenciais do login (senha armazenada com hash)
CREATE TABLE IF NOT EXISTS app_credenciais (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  usuario TEXT NOT NULL DEFAULT 'dondoquinha',
  senha_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_credenciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_app_credenciais" ON app_credenciais;
CREATE POLICY "anon_all_app_credenciais"
  ON app_credenciais FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
