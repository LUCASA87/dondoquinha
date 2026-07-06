-- Produto manual na venda (sem cadastro no estoque)
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS descricao TEXT;
