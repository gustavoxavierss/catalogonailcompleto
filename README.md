# Meu Catálogo Nail

Aplicação Next.js/React/TypeScript para criação de catálogos de serviços, com Supabase Auth, PostgreSQL, Storage privado e PDF A4 gerado no servidor.

## Estado da entrega

Imagem original de Mikaelly aplicada à apresentação, com cards de compra avulsa e mensal (R$ 15,99) e links Wiapy em `src/lib/offers.ts`. O projeto está no branch `main` do GitHub (`gustavoxavierss/catalogonailcompleto`) e há um deploy READY na Vercel em `https://catalogonailcompleto.vercel.app`. O webhook cadastrado é `https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay`.

O código da aplicação, migração, testes e guias estão implementados. **Não considerar a operação comercial liberada:** ainda não há um projeto Supabase exclusivo conectado. A central oficial Wiapy documenta POST JSON, o header `Authorization`, estados de pagamento em centavos e dados de assinatura; ela não documenta na página disponível criação/consulta de cobranças, referência de pedido, assinatura criptográfica ou ID independente do evento. O endpoint segue fechado, nenhum pagamento é simulado e nenhum PDF é liberado por ele. Veja `docs/GATEWAY.md`.

Sem configuração, a landing e as páginas públicas funcionam; ações dependentes do Supabase retornam uma mensagem de preparação. Os testes de banco usam um PostgreSQL isolado em PGlite, sem alterar bancos existentes. Os testes de editor usam respostas controladas exclusivamente no navegador de testes, fora da aplicação publicada.

## Arquitetura

- Next.js App Router, React, TypeScript estrito e CSS responsivo. Fontes distribuídas com a aplicação.
- API Routes Node.js: validação Zod, autenticação consultada no servidor, autorização por proprietário, validação de origem e limites de frequência em operações sensíveis.
- Supabase Auth: e-mail/senha, confirmação por e-mail, recuperação, sessão em cookies HttpOnly/SameSite/Secure em HTTPS e logout. O fluxo PKCE está preparado para adicionar OAuth posteriormente.
- PostgreSQL: RLS em todas as tabelas públicas, acesso de leitura do proprietário, escrita exclusivamente pelo backend. A chave privilegiada não entra no navegador.
- Documentos de rascunho em JSONB + projeções normalizadas de categorias, serviços, fotos e contatos, atualizadas na mesma transação.
- Compra por revisão imutável. Alterar o rascunho preserva a versão comprada e seus arquivos.
- Pagamentos: contrato `PaymentProvider`, pedido com valor centralizado, criação idempotente, processamento transacional de eventos e fila persistente de PDF.
- PDF: pdf-lib, imagens JPEG otimizadas com Sharp, QR Code, links, paginação e margens A4. Não usa impressão da tela nem geração no navegador.
- Arquivos: buckets privados `catalog-images` e `catalog-pdfs`. Imagens têm rota autenticada; PDF tem autorização e link assinado com validade de 60 segundos.

## Funcionalidades

Landing; cadastro/login/recuperação/logout; painel; assistente em cinco etapas; identidade e contatos com visibilidade; imagens com progresso, substituição, remoção do catálogo e ordenação; serviços e categorias personalizadas; ordenação por setas e arrastar serviços; quatro presets visuais; edição de cores, fontes, imagens e cards; salvamento automático com controle de concorrência; prévia com marca d'água; validação de finalização; fluxo de checkout e acompanhamento; download privado; administração e métricas de conversão; termos e política inicial.

O editor salva também campos de contato incompletos como rascunho. O checkout valida os dados completos. Antes de fechar o editor, aguarde “Salvo ✓”. Fechar o navegador antes de um envio terminar pode interromper a última alteração; a interface avisa quando há alterações pendentes. Conflitos entre abas não sobrescrevem dados silenciosamente.

Não há limite comercial arbitrário de serviços. Cada requisição de rascunho aceita até 2 MB; cada serviço aceita até 12 fotos. Uploads: JPG/PNG/WebP até 4 MB, máximo de 40 megapixels decodificados, redimensionamento até 1800 px sem ampliação, JPEG qualidade 86. Miniaturas autenticadas têm até 720 px. Imagens removidas do rascunho são preservadas no Storage para não quebrar compras anteriores; veja política operacional de retenção.

## Banco

Migração: `supabase/migrations/20261013124052_initial_catalog_platform.sql`. `schema.sql` é a cópia legível do mesmo esquema. Aplique somente uma vez, usando a migração.

| Tabela | Papel |
|---|---|
| `auth.users` | Contas geridas pelo Supabase |
| `profiles` | Nome, e-mail e registro inicial de aceite |
| `admin_users` | Administradores definidos fora do navegador |
| `catalogs` | Documento editável, proprietário e revisão |
| `categories`, `services`, `service_images`, `social_links` | Conteúdo normalizado e ordem |
| `assets` | Inventário privado de uploads por usuária/catálogo |
| `catalog_versions` | Snapshot imutável vinculado à compra |
| `orders` | Valor em centavos, moeda, gateway, estado e IDs externos |
| `payments` | Pagamento associado ao pedido |
| `webhook_events` | Identificador único e hash do evento processado |
| `pdf_jobs`, `pdf_files` | Geração com lock/retry e arquivo privado |
| `app_settings` | Nome, preço, logo e contatos de suporte |
| `analytics_events` | Eventos do funil gerados no servidor |
| `rate_limits` | Limites atômicos por janela |

Índices de proprietário, consulta de pedidos e funil; foreign keys compostas para impedir referências cruzadas; índice único parcial para um pedido ativo por versão. Nenhuma política permite a clientes alterar pedidos, arquivos PDF, administradores ou configurações.

## Instalação local

Requer Node.js 24 e npm. Na pasta do projeto:

```powershell
npm ci
Copy-Item .env.example .env.local
npm test
npm run typecheck
npm run build
npm start
```

Preencha `.env.local` com um projeto Supabase exclusivo para este produto antes de testar os fluxos conectados. Para desenvolvimento, use `npm run dev`. Não envie `.env.local` para repositórios.

## Variáveis

| Nome | Uso |
|---|---|
| `APP_URL` | Origem exata: `http://localhost:3000` local ou URL HTTPS de produção |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (uma anon key legada também é aceita pelo SDK) |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor, chave com acesso privilegiado |
| `QIAPAY_WEBHOOK_SECRET` | Token escolhido pelo produtor no campo “Token para autenticação” da Wiapy; a plataforma o envia no header `Authorization` |
| `QIAPAY_SINGLE_CHECKOUT_ID` | ID do checkout avulso informado no payload oficial (`checkout.id`), necessário para permitir a associação do pedido |
| `QIAPAY_MONTHLY_CHECKOUT_ID` | ID do checkout recorrente informado no payload oficial (`checkout.id`) |
| `PAYMENT_PROVIDER` | `disabled`; mudar a variável sozinha **não** habilita pagamentos |

`DATABASE_URL` não é necessária no runtime, pois o backend usa a API Supabase. Ferramentas de administração/migração podem solicitar conexão direta separadamente. Nenhum segredo real acompanha a entrega.

## Supabase

1. Crie um projeto separado, preferencialmente na região São Paulo. Não reutilize um banco de outro produto.
2. Aplique a migração com Supabase CLI ou execute o SQL no SQL Editor do projeto correto. Em ambiente existente, revise antes de aplicar.
3. Copie URL/chaves para o ambiente seguro do servidor.
4. Ative confirmação de e-mail, configure SMTP de produção, proteção contra abuso e limites do Auth.
5. Configure Site URL = `APP_URL` e Redirect URLs: `APP_URL/auth/callback` e `APP_URL/auth/callback?next=/redefinir-senha`.
6. Mantenha os buckets privados. Não adicione políticas públicas nem permita escrita de clientes em tabelas financeiras.
7. Cadastre sua conta normalmente. Depois, usando SQL administrativo, insira seu UUID em `admin_users`: `insert into public.admin_users(user_id) values ('UUID_DA_SUA_CONTA');`.
8. Abra `/admin/configuracoes` e configure nome, preço, logo HTTPS e atendimento.
9. Execute os testes conectados em homologação antes de divulgar.

## Wiapy

Leia `docs/GATEWAY.md`. Ponto de conexão: `src/lib/payments/provider.ts`. O contrato documentado e suas limitações estão registrados; o adaptador permanece desativado.

URL cadastrada na integração:

```text
https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay
```

O endpoint ainda retorna 503 até o Supabase, o token, os IDs reais dos checkouts e o fluxo de associação por e-mail serem configurados e homologados.

## Testes

```powershell
npm test
npm run typecheck
npm run build
npm start
npm exec playwright -- test e2e/public.spec.ts --workers=2
```

Os testes usam o Chrome instalado. Ajuste `channel` em `playwright.config.ts` se usar outro navegador compatível.

Editor isolado (outro terminal):

```powershell
npm exec vite -- --config vite.ui.config.ts
npm exec playwright -- test e2e/editor.spec.ts --workers=2
```

Para integração real: defina `E2E_EMAIL` e `E2E_PASSWORD` com uma conta descartável de **homologação**, conecte o Supabase e execute `npm exec playwright -- test e2e/connected.spec.ts --project=mobile-390`. Esse teste cria um catálogo; não o execute em uma conta de cliente. Não existem usuários fictícios semeados na produção.

Consulte `docs/VERIFICACAO.md` para distinguir o que foi executado do que depende dos serviços externos.

## Publicação

Importe este diretório como projeto Next.js na Vercel, com Node 24, `npm ci` e `npm run build`. Configure as variáveis nos ambientes corretos. Crie um ambiente de homologação com banco separado. Use o checklist em `docs/LANCAMENTO.md` antes de promover a produção.

O app pode ser publicado sem credenciais para revisão da apresentação, mas criação de contas/catálogos não funcionará até a conexão do Supabase. Isso não constitui lançamento comercial.

## Privacidade e operação

Termos e política são uma base inicial e identificam os dados utilizados. Complete razão social/CNPJ, contato responsável, prazos de retenção e análise dos fornecedores/transferências antes de abrir ao público. O aceite não é tratado como autorização indiscriminada para qualquer finalidade.

O evento `pdf_downloaded` registra a emissão autorizada do link de download, não prova que o dispositivo terminou de gravar o arquivo. O funil conta usuárias únicas. Após reembolso, novos links são negados; um link já emitido pode funcionar até seus 60 segundos expirarem. Uma cópia já baixada não pode ser revogada.

Falhas de PDF ficam registradas em `pdf_jobs` e podem ser retomadas no download. Um lock antigo é recuperado após cinco minutos. Para operação com alto volume, adicione um worker agendado para retentativas proativas, monitore a fila e dimensione o limite de execução. Arquivos privados nunca devem ser servidos por uma pasta pública do site.
