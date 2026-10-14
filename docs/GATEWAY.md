# Wiapy: integração e ativação

Fonte oficial: https://help.wiapy.com/pt-br/article/webhook-jtggmu/
POST JSON; token no cabeçalho Authorization. A documentação disponível não descreve HMAC nem API de consulta; não inventamos esses mecanismos.

## Checkouts verificados
- Avulso https://pay.wiapy.com/G5KoHkHx8TSP: checkout.id 6ace757ec8bdfc294912eb4f, amount 1990, type payment.
- Mensal https://pay.wiapy.com/6ace76946ebcdbf6682ec046: checkout.id 6ace76946ebcdbf6682ec046, amount 1599, type subscription, interval month.

Conferidos no conteúdo público dos checkouts. O código público preserva utm_content em tracking, campo previsto no webhook oficial. O backend envia o UUID aleatório do pedido em utm_content. Nunca associa por e-mail, retorno do navegador ou localStorage.

## Verificações
Token em tempo constante, ID do checkout, valor em centavos, modalidade, transação, referência interna e data. BRL definido no pedido; quando presente no evento, moeda deve ser BRL. Mudança de preço exige ajustar checkout e configuração antes da venda.

Banco transacional com lock por transação externa, idempotência e estados monotônicos. Eventos repetidos não duplicam liberação; eventos antigos não desfazem estorno; referência contraditória é rejeitada. Timestamp não substitui autenticação: segurança depende de token forte e HTTPS.

Estados: paid, unpaid, credit_card_declined, refunded, chargedback. Mensal aprovado exige subscription.id, interval month, active true e dt_end ou next_billing. Renovação sem tracking só vale para assinatura já vinculada. Cancelamento sem estorno mantém período já pago; não inventamos evento ausente da documentação.

## Ativar
1. Em https://wiapy.com/producer/integrations/list, editar nail catalogo e selecionar ambos os checkouts.
2. URL: https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay
3. Configurar token aleatório forte (mínimo 32 caracteres) no campo Token para autenticação.
4. Armazenar o mesmo token em QIAPAY_WEBHOOK_SECRET na Vercel, como segredo.
5. Definir PAYMENT_PROVIDER=wiapy e publicar.
6. Homologar compra avulsa, mensal, renovação, recusa, duplicação e estorno reais.

O painel fornecido mostrava o token vazio. O controle do navegador está indisponível nesta sessão; não foi possível preenchê-lo. O webhook permanece fechado. Nenhum pagamento real foi realizado.

O botão Verificar pagamento consulta o banco atualizado pelo webhook. Não afirma consultar uma API de status inexistente na documentação. Geração ocorre após confirmação e pode ser retomada no download autorizado. Um payload real ainda deve confirmar o contrato exato da conta; campos ausentes que impeçam validação segura não são presumidos.
