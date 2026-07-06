-- Políticas RLS para o app Dondoquinha (uso interno, sem login)
-- Execute no SQL Editor do Supabase APÓS o 001_initial_schema.sql
-- Pode rodar de novo com segurança (políticas são recriadas se já existirem)

-- produtos
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_produtos" ON produtos;
CREATE POLICY "anon_all_produtos"
  ON produtos FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_clientes" ON clientes;
CREATE POLICY "anon_all_clientes"
  ON clientes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- vendas
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_vendas" ON vendas;
CREATE POLICY "anon_all_vendas"
  ON vendas FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- venda_itens
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_venda_itens" ON venda_itens;
CREATE POLICY "anon_all_venda_itens"
  ON venda_itens FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- parcelas_vendas
ALTER TABLE parcelas_vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_parcelas_vendas" ON parcelas_vendas;
CREATE POLICY "anon_all_parcelas_vendas"
  ON parcelas_vendas FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- contas_a_pagar
ALTER TABLE contas_a_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_contas_a_pagar" ON contas_a_pagar;
CREATE POLICY "anon_all_contas_a_pagar"
  ON contas_a_pagar FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- cartoes_credito
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_cartoes_credito" ON cartoes_credito;
CREATE POLICY "anon_all_cartoes_credito"
  ON cartoes_credito FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- faturas_cartao
ALTER TABLE faturas_cartao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_faturas_cartao" ON faturas_cartao;
CREATE POLICY "anon_all_faturas_cartao"
  ON faturas_cartao FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
