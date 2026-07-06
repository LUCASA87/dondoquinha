-- Crediário: observações, pagamentos parciais e histórico
-- Execute no SQL Editor do Supabase

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS obs TEXT;

ALTER TABLE parcelas_vendas
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_forma_pagamento_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_forma_pagamento_check
  CHECK (forma_pagamento IN ('credito', 'boleto', 'pix', 'dinheiro', 'cheque', 'crediario'));

CREATE TABLE IF NOT EXISTS pagamentos_crediario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  parcela_id UUID NOT NULL REFERENCES parcelas_vendas(id) ON DELETE CASCADE,
  valor_pago NUMERIC(12, 2) NOT NULL CHECK (valor_pago > 0),
  obs TEXT,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_venda ON pagamentos_crediario(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela ON pagamentos_crediario(parcela_id);

ALTER TABLE pagamentos_crediario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_pagamentos_crediario" ON pagamentos_crediario;
CREATE POLICY "anon_all_pagamentos_crediario"
  ON pagamentos_crediario FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
