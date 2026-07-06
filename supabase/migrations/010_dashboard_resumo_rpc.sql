-- Resumo do dashboard em uma única consulta (menos idas ao Supabase)
CREATE OR REPLACE FUNCTION get_dashboard_resumo()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_custo', COALESCE(SUM(p.quantidade * p.preco_custo), 0),
    'total_venda', COALESCE(SUM(p.quantidade * p.preco_venda), 0),
    'lucro_estimado', COALESCE(SUM(p.quantidade * (p.preco_venda - p.preco_custo)), 0),
    'total_a_receber', (
      SELECT COALESCE(SUM(
        CASE
          WHEN (pv.valor_parcela - COALESCE(pv.valor_pago, 0)) > 0.001
          THEN pv.valor_parcela - COALESCE(pv.valor_pago, 0)
          ELSE 0
        END
      ), 0)
      FROM parcelas_vendas pv
      WHERE pv.status = 'pendente'
    ),
    'total_a_pagar', (
      SELECT COALESCE(SUM(c.valor), 0)
      FROM contas_a_pagar c
      WHERE c.status = 'pendente'
    )
  )
  FROM produtos p;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_resumo() TO anon, authenticated;
