-- Custo unitário em itens de venda (produto avulso)
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(12, 2);
