# Contrato conhecido da integração Wiapy

## Situação

### Links e webhook fornecidos pelo proprietário

- Avulso, R$ 19,90: https://pay.wiapy.com/G5KoHkHx8TSP
- Recorrente, R$ 15,99/mês: https://pay.wiapy.com/6ace76946ebcdbf6682ec046

Centralizados em `src/lib/offers.ts`. Os cards na landing e na tela de pagamento apresentam os links externos com aviso de que as vendas aguardam ativação automática. Não são usados como prova de pagamento, não recebem parâmetros inventados e não criam uma associação fictícia com pedidos internos. Os valores e IDs dos checkouts ainda precisam ser conferidos no painel da Wiapy.

A assinatura mensal tem apresentação comercial, mas ainda não tem concessão/revogação de acesso integrada. A proposta é manter edição enquanto a assinatura estiver ativa; não é acesso vitalício. A central de ajuda explica a configuração de checkout recorrente e expõe `subscription.id`, `status`, `active`, `dt_end` e `next_billing` no payload, mas a página consultada não descreve todos os eventos de cancelamento/renovação nem um endpoint de consulta.

Domínio solicitado: `https://catalogonailcompleto.vercel.app`.

URL exata para cadastrar no gateway quando a implantação estiver ativa: `https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay`.

Configurar `APP_URL=https://catalogonailcompleto.vercel.app` na Vercel. O endpoint de produção continuará fechado até a integração oficial estar implementada e homologada.

O contrato público disponível para webhook está identificado. O adaptador segue deliberadamente desativado até configurar o Supabase, token de autenticação, IDs reais de checkout e associação segura da compra à conta. Os links estáticos não documentam um parâmetro de referência interna. Sem isso, não se deve habilitar uma liberação automática.

## Contrato publicado pela Wiapy

Fonte: [Webhook da central de ajuda Wiapy](https://help.wiapy.com/pt-br/article/webhook-jtggmu/), atualizado em 06/07/2026.

- A Wiapy envia POST com `application/json`.
- O token salvo na integração é enviado como `Authorization: <token>`.
- `payment.id` identifica a transação; `payment.status` pode ser `paid`, `unpaid`, `credit_card_declined`, `refunded` ou `chargedback`.
- Valores financeiros estão em centavos; o payload possui `payment.amount` e `checkout.amount`.
- O tipo é `payment` ou `subscription`; a assinatura informa ID, status, intervalo, ativa/inativa, início/fim de período e próxima cobrança.
- O payload inclui `customer.email`, `checkout.id` e produtos. O carrinho abandonado vem com `payment: null` e não pode liberar nada.
- A documentação consultada não descreve assinatura HMAC, timestamp anti-replay, ID único do evento separado de `payment.id`, API de criação/consulta de cobrança, referência de pedido customizada ou formato de eventos de cancelamento.

O endpoint deve comparar `Authorization` em tempo constante com `QIAPAY_WEBHOOK_SECRET`, aceitar apenas payloads válidos de pagamento, conferir checkout ID, tipo, preço esperado e cliente, e deduplicar por transação/status/data de atualização ou hash idempotente do payload. Como a assinatura criptográfica e timestamp anti-replay não são documentados, essa limitação deve permanecer explícita; não afirmar que há garantia de assinatura/replay fornecida pela Wiapy.

## Associação de checkout estático

Não foram inventados parâmetros de URL nem endpoint de API. Para associar a notificação à conta, a pessoa deve pagar com o mesmo e-mail usado no Meu Catálogo Nail. O backend precisa encontrar um pedido pendente único pelo e-mail, `checkout.id`, tipo e valor; caso não haja exatamente um pedido correspondente, rejeitar a liberação e registrar o evento para conciliação. Para evitar ambiguidade, pedidos simultâneos do mesmo e-mail para o mesmo checkout precisam ser bloqueados/reutilizados. Se a Wiapy permitir que o cliente use outro e-mail ou não enviar o ID de checkout esperado, é necessário um procedimento oficial de conciliação antes de ativar PDFs/assinaturas.

## O que falta para habilitar

1. Projeto Supabase exclusivo do produto, migração aplicada e variáveis seguras de ambiente.
2. Token secreto configurado tanto na Wiapy quanto na Vercel em `QIAPAY_WEBHOOK_SECRET`.
3. IDs reais `checkout.id` para os checkouts avulso e mensal, conferidos no payload ou documentação da conta.
4. Valores e produtos dos checkouts confirmados como R$ 19,90 (avulso) e R$ 15,99/mês (recorrente).
5. Confirmação da Wiapy sobre cancelamento, inadimplência, estorno e retries de webhook; documentação pública disponível não cobre esses detalhes.
6. Homologação segura, com pagamentos de teste ou transação controlada, antes de liberar PDFs e acesso recorrente.

Forneça links/documentos e configure segredos no painel do ambiente; não envie chaves por arquivos públicos nem as coloque no frontend.

## Implementação do adaptador

- `createPayment(order, returnUrl)`: recebe o pedido já criado no banco; usa `order.id` como referência/idempotência quando suportado. O valor vem de `orders.amount`, nunca do navegador.
- `getPaymentStatus(order)`: consulta o gateway e produz um resultado normalizado. Para consulta sem evento, construir uma chave de deduplicação determinística documentada, sem confundi-la com um evento assinado.
- `verifyWebhook(rawBody, headers)`: valida o token `Authorization` conforme o contrato público e normaliza apenas estados conhecidos. Não alegar assinatura HMAC/timestamp, pois a documentação pública consultada não descreve esses mecanismos.
- `confirmPayment`: verifica IDs, valor e moeda e executa `confirm_payment`, que deduplica o evento e grava pagamento, pedido, analytics e trabalho PDF atomicamente.

A atualização de `available` para `true` deve acontecer somente após validar o contrato e passar os testes de sandbox. Não adicionar um atalho para marcar `paid` via navegador ou retorno de URL.

## Concorrência e falhas

`begin_checkout` bloqueia o catálogo, congela a revisão e reutiliza o pedido ativo. Como os links são estáticos, não há API documentada para criar cobrança com referência interna nem consultar status; a associação por cliente e checkout deve ser inequívoca. Não liberar em caso de falta de correspondência ou de pedido ambíguo.

Eventos sem a transação esperada são rejeitados. Se o webhook chegar antes da gravação da resposta de criação, dependerá da política oficial de retry; documentar e testar esse cenário. Falhas definitivas e expiradas podem originar nova tentativa; pedidos pagos permanecem associados à versão original.

## URL

`APP_URL/api/payments/webhook/qiapay`

Método POST, corpo bruto, HTTPS em produção. Endpoint atualmente fechado com status 503.

## Homologação obrigatória

- Aprovação real em sandbox produz um pedido pago e um PDF.
- Recusa, pendência, expiração e cancelamento mantêm download bloqueado.
- Reembolso impede novas liberações.
- Valor de R$ 0,01 enviado pelo cliente não altera o valor do pedido.
- Token de autenticação incorreto, corpo inválido, checkout/valor incompatível e transação duplicada são rejeitados ou ignorados idempotentemente.
- Evento repetido não duplica pagamento, evento analítico ou job PDF.
- Evento atrasado não regride `paid`; reembolso é terminal nesta versão.
- Cliques simultâneos e timeout na criação não geram cobranças adicionais.
- Retorno de checkout e parâmetros `paid=true`/`status=approved` não liberam nada.
