-- CPF opcional em clientes (nome continua obrigatório no app)
ALTER TABLE clientes ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE clientes ALTER COLUMN cpf SET DEFAULT NULL;

UPDATE clientes SET cpf = NULL WHERE cpf IS NULL OR btrim(cpf) = '';

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cpf_unique_idx
  ON clientes (cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';
