export const LOJA = {
  nome: "Dondoquinha",
  subtitulo: "MODA E BELEZA",
  nomeCompleto: "Dondoquinha Moda e Beleza",
  logo: "/logo.png",
} as const;

export interface ComprovanteParcela {
  numero: number;
  valor: number;
  dataVencimento: string;
  status: "pago" | "pendente";
  doc: string;
}

export interface ComprovanteItem {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  total: number;
}

export interface ComprovanteVendaData {
  numeroPedido: string;
  dataCompra: string;
  clienteNome: string;
  obs: string | null;
  parcelasTotal: number;
  statusVenda: "pago" | "pendente";
  valorTotal: number;
  itens: ComprovanteItem[];
  parcelas: ComprovanteParcela[];
}

export interface ComprovantePagamentoData {
  numeroPedido: string;
  dataPagamento: string;
  clienteNome: string;
  parcelaNumero: number;
  parcelasTotal: number;
  valorPagoAgora: number;
  obs: string | null;
  valorTotalVenda: number;
  totalJaPago: number;
  saldoRestante: number;
  saldoParcela: number;
  itens: ComprovanteItem[];
}
