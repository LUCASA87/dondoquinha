# Dondoquinha — Sistema de Gestão Comercial e Financeira

Sistema simplificado para gestão de estoque, vendas e finanças da **Dondoquinha Moda e Beleza**.

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4** + componentes estilo Shadcn/ui
- **Supabase** (PostgreSQL)
- **Lucide React** (ícones)

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, execute o arquivo `supabase/migrations/001_initial_schema.sql`
3. Em **Database → Replication**, habilite Realtime para a tabela `produtos` (para atualização automática do Dashboard)

### 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 4. Deploy na Vercel

1. Conecte o repositório na Vercel
2. Adicione as variáveis de ambiente do Supabase
3. Deploy automático

## Módulos

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Resumo de custo, venda e lucro estimado do estoque |
| `/estoque` | Cadastro e gestão de produtos |
| `/clientes` | Cadastro de clientes |
| `/vendas` | Nova venda com parcelamento automático |
| `/financeiro` | A receber, boletos a pagar e faturas de cartão |

## Regras de negócio

- **Dashboard**: valores recalculados em tempo real quando produtos são alterados (Supabase Realtime)
- **Vendas parceladas** (Crédito, Boleto, Cheque): gera parcelas com vencimento a cada 30 dias
- **Pix/Dinheiro**: venda registrada como paga imediatamente
- **Estoque**: quantidade reduzida automaticamente ao finalizar venda
