import { mapDbError } from "@/lib/db/helpers";
import * as financeiroDb from "@/lib/db/financeiro";
import { invalidateAfterFinanceiroChange } from "@/lib/queries/page-cache";

export type {
  PeriodoRelatorioContas,
  ResultadoRelatorioContas,
  ResultadoRecebimentosCrediario,
  FiltroParcelasClientePDF,
  ResultadoRelatorioClienteCompras,
} from "@/lib/db/financeiro";

async function withFinanceiroMutation<T extends { error?: string; success?: boolean }>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    const result = await fn();
    if ("success" in result && result.success) invalidateAfterFinanceiroChange();
    return result;
  } catch (err) {
    return mapDbError(err) as T;
  }
}

async function withFinanceiroRead<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (typeof err === "object" && err !== null && "error" in err) {
      return err as T;
    }
    return mapDbError(err) as T;
  }
}

export async function registrarPagamentoCrediario(
  data: Parameters<typeof financeiroDb.registrarPagamentoCrediario>[0]
) {
  return withFinanceiroMutation(() => financeiroDb.registrarPagamentoCrediario(data));
}

export async function excluirParcelaCrediario(parcelaId: string) {
  return withFinanceiroMutation(() => financeiroDb.excluirParcelaCrediario(parcelaId));
}

export async function createContaAPagar(formData: FormData) {
  return withFinanceiroMutation(() => financeiroDb.createContaAPagar(formData));
}

export async function darBaixaConta(id: string) {
  return withFinanceiroMutation(() => financeiroDb.darBaixaConta(id));
}

export async function createCartao(formData: FormData) {
  return withFinanceiroMutation(() => financeiroDb.createCartao(formData));
}

export async function deleteCartao(id: string) {
  return withFinanceiroMutation(() => financeiroDb.deleteCartao(id));
}

export async function createFaturaCartao(
  data: Parameters<typeof financeiroDb.createFaturaCartao>[0]
) {
  return withFinanceiroMutation(() => financeiroDb.createFaturaCartao(data));
}

export async function darBaixaFatura(id: string) {
  return withFinanceiroMutation(() => financeiroDb.darBaixaFatura(id));
}

export async function getParcelasAbertas() {
  return withFinanceiroRead(() => financeiroDb.getParcelasAbertas());
}

export async function getParcelasAVencer(
  diasAhead?: number,
  opcoes?: Parameters<typeof financeiroDb.getParcelasAVencer>[1]
) {
  return withFinanceiroRead(() => financeiroDb.getParcelasAVencer(diasAhead, opcoes));
}

export async function getDebitoCliente(clienteId: string) {
  return withFinanceiroRead(() => financeiroDb.getDebitoCliente(clienteId));
}

export async function buscarClientesComSaldo(termo: string) {
  return withFinanceiroRead(() => financeiroDb.buscarClientesComSaldo(termo));
}

export async function getTotalAReceber() {
  return withFinanceiroRead(() => financeiroDb.getTotalAReceber());
}

export async function getContasAPagar() {
  return withFinanceiroRead(() => financeiroDb.getContasAPagar());
}

export async function getContasPagasRelatorio(
  periodo: Parameters<typeof financeiroDb.getContasPagasRelatorio>[0]
) {
  return withFinanceiroRead(() => financeiroDb.getContasPagasRelatorio(periodo));
}

export async function getRecebimentosCrediario(dataInicio: string, dataFim: string) {
  return withFinanceiroRead(() => financeiroDb.getRecebimentosCrediario(dataInicio, dataFim));
}

export async function getRelatorioClienteCompras(
  clienteId: string,
  filtro: Parameters<typeof financeiroDb.getRelatorioClienteCompras>[1]
) {
  return withFinanceiroRead(() => financeiroDb.getRelatorioClienteCompras(clienteId, filtro));
}

export async function getTotalBoletosMesAtual() {
  return withFinanceiroRead(() => financeiroDb.getTotalBoletosMesAtual());
}

export async function getCartoes() {
  return withFinanceiroRead(() => financeiroDb.getCartoes());
}

export async function getFaturasCartao() {
  return withFinanceiroRead(() => financeiroDb.getFaturasCartao());
}

export async function getResumoFaturasCartao() {
  return withFinanceiroRead(() => financeiroDb.getResumoFaturasCartao());
}
