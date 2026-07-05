-- Dondoquinha Moda e Beleza - Schema inicial
-- Execute este SQL no Editor SQL do Supabase

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_sku TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  valor_total NUMERIC(12, 2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('credito', 'boleto', 'pix', 'dinheiro', 'cheque')),
  parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS parcelas_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela NUMERIC(12, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente'))
);

CREATE TABLE IF NOT EXISTS contas_a_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cartao TEXT NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faturas_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(12, 2) NOT NULL,
  parcelas_totais INTEGER NOT NULL DEFAULT 1 CHECK (parcelas_totais >= 1),
  parcela_atual INTEGER NOT NULL DEFAULT 1 CHECK (parcela_atual >= 1),
  data_vencimento_fatura DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_venda ON parcelas_vendas(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_status ON parcelas_vendas(status);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_vencimento ON contas_a_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_faturas_cartao_cartao ON faturas_cartao(cartao_id);

-- Habilite Realtime para produtos no painel Supabase:
-- Database → Replication → produtos → Enable
