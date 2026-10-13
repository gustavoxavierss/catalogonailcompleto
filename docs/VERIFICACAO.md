# Verificação da implementação

## Resultados locais

- Compilação de produção Next.js: passou.
- TypeScript: passou.
- Testes Vitest: 39 casos aprovados, incluindo banco PostgreSQL isolado, autorização de rotas e geração de PDF.
- Navegador Chrome: 10 casos públicos aprovados, cobrindo apresentação, cadastro, termos, bloqueio de download e acesso administrativo sem autenticação em 375, 390, 430, 768 e 1440 px.
- Editor React isolado: 5 casos aprovados nas mesmas larguras. Testados autosave, upload com resposta controlada, contatos, serviços, mudança de ordem, template e prévia. As respostas controladas existem apenas no teste do navegador.
- PDF de teste gerado com texto longo, foto de proporção conhecida, acentos, QR Code e link; páginas A4 verificadas e renderizadas para inspeção visual.
- Auditoria de dependências npm durante instalação: nenhuma vulnerabilidade conhecida reportada.

## Evidência por fronteira

| Fronteira | Resultado |
|---|---|
| Navegador → interface pública | Verificada em Chrome |
| Editor → gravação solicitada | Verificada com interceptação de rede no teste de componente |
| API → regras de autorização | Testes de rotas com identidade controlada |
| SQL → transação/RLS/constraints | Executado em PostgreSQL via PGlite; tabelas `auth` e `storage` mínimas em fixture |
| Imagens/PDF → diagramação | PDF gerado e renderizado localmente |
| Supabase Auth/Storage hospedados | Não verificado: projeto deste produto ainda não conectado |
| SMTP e recuperação por e-mail | Não verificado: provedor ainda não configurado |
| Wiapy webhook | Contrato público revisado; integração ainda desativada, sem token/IDs e sem homologação |
| HMAC/timestamp anti-replay | A documentação pública consultada não descreve esses mecanismos |
| Compra → geração → download de ponta a ponta | Pendente em homologação real |

## Casos de segurança exercitados

RLS esconde catálogo de outra usuária; anon não lê catálogos/PDFs; authenticated não altera pagamentos ou chama RPCs privilegiadas; salvar com proprietário incorreto falha; revisão antiga não sobrescreve; pedido usa preço administrativo; duas tentativas reutilizam pedido; apenas um claim inicia checkout; snapshot permanece após edição; valor/moeda/IDs divergentes são rejeitados; PDF não é agendado sem aprovação; eventos duplicados não duplicam liberação; evento pendente não regride pagamento; reembolso revoga liberação; gerador tem lock; API rejeita download anônimo, pedido alheio, origem externa e todos os estados não pagos.

As fixtures de SQL representam o modelo de autorização, mas não substituem o teste com JWTs, buckets e sessões reais do Supabase. O adaptador Wiapy desativado rejeita qualquer webhook; ainda não foram configurados o token de autenticação nem os IDs de checkout.

## Pendências para afirmar “pronto para produção”

Executar a lista `LANCAMENTO.md` com banco, SMTP, domínio e Wiapy reais de homologação. Executar `e2e/connected.spec.ts` com conta exclusiva. Testar upload/download em dispositivos Android/iOS e o processamento de catálogos grandes no limite de execução da hospedagem. Configurar backups e alertas.
# Atualização: imagem e planos

Imagem original fornecida aplicada na landing com proporções preservadas. Cards avulso e mensal de R$ 15,99 exibidos na landing e tela de pagamento. Links externos fornecidos centralizados, com aviso antes da navegação; não alteram permissões nem status de pedidos.

Verificação desta atualização: TypeScript e build de produção aprovados; 10 testes Playwright passaram em 375, 390, 430, 768 e 1440 px. Conferidos carregamento da imagem, valor mensal, URL de recorrência, aviso de ativação pendente, navegação pública e bloqueio de rotas protegidas. Capturas desktop/mobile inspecionadas. A primeira execução foi interrompida por falta de espaço no disco; após remover somente o cache gerado do projeto, a repetição na versão de produção passou.

Não homologado: conteúdo/valor dos checkouts externos, transação real, renovação, cancelamento e assinatura ativa. Links de pagamento não substituem o contrato de integração. O deploy público não significa que Supabase ou pagamentos estejam configurados.

## Publicação Vercel

Projeto `catalogonailcompleto` criado. Deploy de produção `dpl_9x4xQv4WmwhjdKoCSgd1oqCyvHkx`, status READY, alias `catalogonailcompleto.vercel.app`, região de função `gru1`. A variável `APP_URL` está configurada para produção, preview e desenvolvimento. O site está publicado, mas ainda sem configuração do Supabase e sem integração QIpay; cadastro e pagamentos reais ainda não estão operacionais.

O código está publicado no branch `main` de `gustavoxavierss/catalogonailcompleto`. Ainda não foi confirmado que a Vercel está vinculada a esse repositório para deploy automático.

