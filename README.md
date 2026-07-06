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
2. No **SQL Editor**, execute os arquivos nesta ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql` *(obrigatório — libera cadastros)*
   - `supabase/migrations/007_contas_data_pagamento.sql`
   - `supabase/migrations/008_app_credenciais.sql` *(login e troca de senha)*
3. Em **Database → Replication**, habilite Realtime para a tabela `produtos` (para atualização automática do Dashboard)

### 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon

# Login do sistema
AUTH_USER=dondoquinha
AUTH_PASSWORD=sua-senha
AUTH_SECRET=uma-chave-longa-e-aleatoria
```

O `AUTH_SECRET` pode ser qualquer texto longo e aleatório (ex.: gere com `openssl rand -hex 32`).

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será direcionado para a tela de login.

### 4. Deploy na Vercel

1. Conecte o repositório na Vercel
2. Adicione as variáveis de ambiente do Supabase **e** as de login (`AUTH_USER`, `AUTH_PASSWORD`, `AUTH_SECRET`)
3. Deploy automático

## Módulos

| Rota | Descrição |
|------|-----------|
| `/login` | Acesso ao sistema (usuário e senha) |
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
