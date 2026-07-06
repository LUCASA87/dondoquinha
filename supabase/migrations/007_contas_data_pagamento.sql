-- Data em que a conta foi dada baixa (paga)
ALTER TABLE contas_a_pagar
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;
