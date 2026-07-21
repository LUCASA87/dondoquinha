-- Guarda o nome da cliente na venda para manter histórico se ela for excluída.
-- vendas.cliente_id já é ON DELETE SET NULL; o nome fica em cliente_nome.

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_nome TEXT;

UPDATE vendas v
SET cliente_nome = c.nome
FROM clientes c
WHERE v.cliente_id = c.id
  AND (v.cliente_nome IS NULL OR btrim(v.cliente_nome) = '');
