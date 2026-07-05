export type StatusPagamento = "pago" | "pendente";
export type FormaPagamento = "credito" | "boleto" | "pix" | "dinheiro" | "cheque";

export interface Produto {
  id: string;
  nome: string;
  codigo_sku: string | null;
  quantidade: number;
  preco_custo: number;
  preco_venda: number;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
}

export interface Venda {
  id: string;
  cliente_id: string | null;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  parcelas: number;
  status: StatusPagamento;
  data_venda: string;
  created_at: string;
  clientes?: Pick<Cliente, "nome"> | null;
}

export interface VendaItem {
  id: string;
  venda_id: string;
  produto_id: string | null;
  quantidade: number;
  preco_unitario: number;
}

export interface ParcelaVenda {
  id: string;
  venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  status: StatusPagamento;
  vendas?: Venda & { clientes?: Pick<Cliente, "nome"> | null };
}

export interface ContaAPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: StatusPagamento;
  created_at: string;
}

export interface CartaoCredito {
  id: string;
  nome_cartao: string;
  dia_vencimento: number;
  limite: number | null;
  created_at: string;
}

export interface FaturaCartao {
  id: string;
  cartao_id: string;
  descricao: string;
  valor_total: number;
  parcelas_totais: number;
  parcela_atual: number;
  data_vencimento_fatura: string;
  status: StatusPagamento;
  created_at: string;
  cartoes_credito?: Pick<CartaoCredito, "nome_cartao" | "dia_vencimento">;
}

export interface DashboardStats {
  totalCusto: number;
  totalVenda: number;
  lucroEstimado: number;
}
