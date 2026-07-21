export type StatusPagamento = "pago" | "pendente";
export type FormaPagamento =
  | "credito"
  | "boleto"
  | "pix"
  | "dinheiro"
  | "cheque"
  | "crediario";

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
  cpf: string | null;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
}

export interface Venda {
  id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  parcelas: number;
  status: StatusPagamento;
  data_venda: string;
  obs: string | null;
  created_at: string;
  clientes?: Pick<Cliente, "nome"> | null;
}

export interface VendaItem {
  id: string;
  venda_id: string;
  produto_id: string | null;
  descricao?: string | null;
  quantidade: number;
  preco_unitario: number;
  preco_custo: number | null;
}

export interface ParcelaVenda {
  id: string;
  venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  valor_pago: number;
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
  parcelas_totais: number;
  parcela_atual: number;
  data_pagamento: string | null;
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

export interface ParcelaDebito extends ParcelaVenda {
  saldo_parcela: number;
}

export interface VendaDebito {
  id: string;
  numeroPedido: string;
  data_venda: string;
  valor_total: number;
  totalPago: number;
  saldoRestante: number;
  parcelasTotal: number;
  obs: string | null;
  produtos: string[];
  parcelas: ParcelaDebito[];
}

export interface ClienteDebitoResumo {
  cliente: Cliente;
  totalDevido: number;
  totalPago: number;
  totalCompras: number;
  vendas: VendaDebito[];
}

export interface ClienteComSaldo {
  id: string;
  nome: string;
  cpf: string | null;
  totalDevido: number;
}

export interface ParcelaAVencer {
  id: string;
  venda_id: string;
  numero_parcela: number;
  parcelas_total: number;
  saldo_parcela: number;
  data_vencimento: string;
  numero_pedido: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  produtos: string[];
  status_vencimento: "vencida" | "hoje" | "a_vencer";
}
