-- Boletos parcelados (contas a pagar)
-- Execute no SQL Editor do Supabase

ALTER TABLE contas_a_pagar
  ADD COLUMN IF NOT EXISTS parcelas_totais INTEGER NOT NULL DEFAULT 1 CHECK (parcelas_totais >= 1);

ALTER TABLE contas_a_pagar
  ADD COLUMN IF NOT EXISTS parcela_atual INTEGER NOT NULL DEFAULT 1 CHECK (parcela_atual >= 1);
