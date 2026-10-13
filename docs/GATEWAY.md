# Contrato de integração QIpay/Qiapay

## Situação

### Links fornecidos pelo proprietário

- Avulso, R$ 19,90: https://pay.wiapy.com/G5KoHkHx8TSP
- Recorrente, R$ 15,99/mês: https://pay.wiapy.com/6ace76946ebcdbf6682ec046

Centralizados em `src/lib/offers.ts`. Os cards na landing e na tela de pagamento apresentam os links externos com aviso de que as vendas aguardam ativação automática. Não são usados como prova de pagamento, não recebem parâmetros inventados e não criam uma associação fictícia com pedidos internos. Os valores dos checkouts externos ainda precisam ser conferidos no painel do gateway.

A assinatura mensal tem apresentação comercial, mas ainda não tem cobrança/entitlement recorrente integrado. Antes de abrir vendas, implementar e homologar a identificação da assinatura e cliente, cada renovação, período pago, cancelamento, inadimplência e reembolso, além da política de acesso após término. A proposta é manter acesso e edições enquanto a assinatura estiver ativa; não é acesso vitalício. Confirmar na documentação oficial como associar estes links estáticos ao usuário/pedido, ou usar criação de checkout pela API oficial.

Domínio solicitado: `https://catalogonailcompleto.vercel.app`.

URL exata para cadastrar no gateway quando a implantação estiver ativa: `https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay`.

Configurar `APP_URL=https://catalogonailcompleto.vercel.app` na Vercel. O endpoint de produção continuará fechado até a integração oficial estar implementada e homologada.

Integração externa deliberadamente desativada. A aplicação contém a infraestrutura de pedidos, autenticação, validação, idempotência, eventos e liberação. A implementação específica depende da documentação oficial. Definir chaves no ambiente não basta: `QiapayProvider.available` permanece `false`.

## Informações necessárias

1. Nome correto do produto, URL da documentação oficial e domínios de sandbox/produção.
2. Como autenticar cada chamada: API key, secret, token, cabeçalhos, permissões e eventual expiração.
3. Criação de checkout: endpoint oficial, campos obrigatórios, formato de valor/moeda, referência interna do pedido, URL de retorno, expiração e resposta completa.
4. Recursos de idempotência e consulta por referência interna para resolver timeouts sem gerar cobranças duplicadas.
5. Consulta de status: endpoint, identificadores exigidos e estados possíveis.
6. Webhooks: eventos oficiais, exemplo completo do corpo bruto e dos cabeçalhos, algoritmo de assinatura, codificação, segredo, timestamp, janela de tolerância, ID do evento e regras de repetição/acknowledgement.
7. Relação exata entre checkout ID, order ID e transaction ID.
8. Eventos de cancelamento, expiração, estorno e reembolso; se podem chegar fora de ordem.
9. Exigência de consulta adicional à API após o webhook e consistência eventual do status.
10. Credenciais e contas de teste, formas de provocar aprovação, recusa, expiração e reembolso no sandbox.
11. Regras de dados pessoais exigidos no checkout, recibos, taxas, parcelamento e meios de pagamento.

Forneça links/documentos e configure segredos no painel do ambiente; não envie chaves por arquivos públicos nem as coloque no frontend.

## Implementação do adaptador

- `createPayment(order, returnUrl)`: recebe o pedido já criado no banco; usa `order.id` como referência/idempotência quando suportado. O valor vem de `orders.amount`, nunca do navegador.
- `getPaymentStatus(order)`: consulta o gateway e produz um resultado normalizado. Para consulta sem evento, construir uma chave de deduplicação determinística documentada, sem confundi-la com um evento assinado.
- `verifyWebhook(rawBody, headers)`: valida assinatura/secret/timestamp e só então normaliza o evento. Nunca reconstruir JSON antes da validação da assinatura. Rejeitar formatos desconhecidos.
- `confirmPayment`: verifica IDs, valor e moeda e executa `confirm_payment`, que deduplica o evento e grava pagamento, pedido, analytics e trabalho PDF atomicamente.

A atualização de `available` para `true` deve acontecer somente após validar o contrato e passar os testes de sandbox. Não adicionar um atalho para marcar `paid` via navegador ou retorno de URL.

## Concorrência e falhas

`begin_checkout` bloqueia o catálogo, congela a revisão e reutiliza o pedido ativo. `claim_checkout` permite apenas uma tentativa inicial de criação por pedido. Depois de um timeout ambíguo, não remover o claim nem criar outra cobrança automaticamente: conciliar o pedido pela referência interna usando o mecanismo oficial. Essa conciliação deve fazer parte do adaptador quando o contrato for conhecido.

Eventos sem a transação esperada são rejeitados. Se o webhook chegar antes da gravação da resposta de criação, dependerá da política oficial de retry; documentar e testar esse cenário. Falhas definitivas e expiradas podem originar nova tentativa; pedidos pagos permanecem associados à versão original.

## URL

`APP_URL/api/payments/webhook/qiapay`

Método POST, corpo bruto, HTTPS em produção. Endpoint atualmente fechado com status 503.

## Homologação obrigatória

- Aprovação real em sandbox produz um pedido pago e um PDF.
- Recusa, pendência, expiração e cancelamento mantêm download bloqueado.
- Reembolso impede novas liberações.
- Valor de R$ 0,01 enviado pelo cliente não altera o valor do pedido.
- Assinatura inválida, segredo incorreto e timestamp fora da janela são rejeitados.
- Evento repetido não duplica pagamento, evento analítico ou job PDF.
- Evento atrasado não regride `paid`; reembolso é terminal nesta versão.
- Cliques simultâneos e timeout na criação não geram cobranças adicionais.
- Retorno de checkout e parâmetros `paid=true`/`status=approved` não liberam nada.
