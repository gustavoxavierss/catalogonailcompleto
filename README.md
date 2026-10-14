# Meu Catálogo Nail

Next.js, React e TypeScript; Supabase Auth, PostgreSQL com RLS, Storage privado e PDF A4 no servidor.

## Jornada
A visitante começa em /catalogo/novo sem login. Texto e fotos ficam no IndexedDB do navegador, com salvamento automático. Ao finalizar, vê a prévia borrada com cadeado. O cadastro transfere o rascunho e fotos para a conta e libera a prévia completa. A compra avulsa libera uma versão imutável por R$ 19,90. A assinatura de R$ 15,99 libera novas versões durante o período mensal confirmado.

O desfoque é uma etapa visual de conversão, não proteção criptográfica: os dados foram fornecidos pela própria visitante. O PDF final tem controle de acesso real no servidor e nunca é entregue pela prévia.

## Banco preparado
O projeto anterior sistemahotelsp foi excluído pelo proprietário. O novo projeto catalogonailcompleto deve ser criado em InstaFlow AI. A estrutura está pronta no esquema nail_catalog e precisa ser reinstalada no novo projeto.

Para reproduzir em outro projeto:
1. Execute supabase/catalog-platform.sql uma vez.
2. Execute supabase/wiapy-payments.sql uma vez.
3. Exponha nail_catalog na Data API (configuração de schemas expostos).
4. Configure URL, chave publicável e acesso privilegiado somente no servidor.
5. Configure Auth Site URL = APP_URL e redirects para APP_URL/auth/callback e APP_URL/auth/callback?next=/redefinir-senha.
6. Configure SMTP e valide recuperação de senha.

Tabelas: profiles, admin_users, catalogs, categories, services, service_images, social_links, assets, catalog_versions, orders, payments, subscriptions, pdf_files, pdf_jobs, webhook_events, app_settings, analytics_events, rate_limits e backend_nonces. Todas têm RLS; tabelas financeiras não permitem escrita pelo cliente. Buckets catalog-images e catalog-pdfs são privados. Relações, índices e constraints estão no SQL.

## Acesso do servidor
Alternativa à service role na Vercel: supabase/functions/nail-backend/index.ts verifica assinaturas Ed25519, timestamp de 30 segundos e nonce único. Só aceita tabelas, RPCs e buckets autorizados. A service role permanece dentro do Supabase. A chave pública fica no código; a privada SUPABASE_BRIDGE_PRIVATE_KEY fica exclusivamente no servidor Next.js. Para outra instalação, gere outro par de chaves e substitua a pública antes de publicar a função.

A configuração pública anterior da Vercel ainda aponta para o projeto excluído e deve ser substituída diretamente pela configuração do projeto novo. O envio da chave privada foi bloqueado pela revisão automática e depende de autorização explícita. Até resolver isso, o backend de produção não está operacional, embora a criação local sem conta funcione.

## Desenvolvimento
Node.js 24. Execute npm ci, copie .env.example para .env.local, preencha o ambiente e rode npm run dev.
Verificação: npm test, npm run typecheck e npm run build.
Não versionar .env.local. O cache persistente de desenvolvimento foi desativado para reduzir uso de disco.

## Funcionalidades
Landing com a imagem fornecida; assistente de identidade, contatos, serviços, personalização e revisão; fotos otimizadas; categorias; ordenação; quatro estilos; salvamento automático; cadastro e sessão; importação idempotente; painel; planos; webhook Wiapy; assinaturas; PDF com QR Code e links; download privado; administração e eventos do funil.

Nome, preço e suporte ficam em /admin/configuracoes. Para cadastrar administrador, insira um UUID existente em nail_catalog.admin_users pelo banco. Cadastros públicos não concedem esse privilégio.

## Publicação e pagamentos
GitHub: https://github.com/gustavoxavierss/catalogonailcompleto
Site: https://catalogonailcompleto.vercel.app
Webhook: https://catalogonailcompleto.vercel.app/api/payments/webhook/qiapay

Na Vercel: framework Next.js, Node 24, npm ci, npm run build. Nunca prefixar segredos com NEXT_PUBLIC.
O adaptador Wiapy está em src/lib/payments/wiapy.ts. Continua desativado até configurar o token nos dois lados e homologar eventos reais.
Leia docs/GATEWAY.md, docs/VERIFICACAO.md e docs/LANCAMENTO.md.

Termos e privacidade são bases iniciais: preencher responsável, suporte e política de retenção antes de vender. O evento pdf_downloaded registra entrega do link autorizado, não conclusão do download. Links assinados valem 60 segundos; arquivos já baixados não podem ser revogados.

## Atualização após exclusão do projeto antigo
O proprietário excluiu sistemahotelsp durante esta execução. O cadastro e a transferência tinham passado no teste real antes da exclusão; essa configuração deixou de existir. O projeto novo catalogonailcompleto está aguardando criação em InstaFlow AI. O conector de criação exige confirm_cost_id, mas get_cost está indisponível. Não foram apagados arquivos de código. Após criar o projeto, reaplique catalog-platform.sql e wiapy-payments.sql, publique a Edge Function e atualize as variáveis locais e da Vercel. Repita o teste conectado no projeto novo.

Build de produção concluído com sucesso; 49 testes passaram. O fluxo real de cadastro, transferência da foto e saída passou antes da exclusão do Supabase antigo. Não interpretar esses resultados como validação do projeto novo ainda não criado.

