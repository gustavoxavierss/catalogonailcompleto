# Verificação

49 testes unitários e de banco isolado passaram antes da rodada final. Testes de visitante passaram em 375px, 390px, 430px, tablet e desktop: texto/fotos persistidos após recarregar e prévia com desfoque/cadeado, sem chamadas de criação ao backend antes do cadastro.

Ponte Supabase: leitura assinada 200, replay 409, sem assinatura 401. Checkouts públicos: valores e IDs conferidos. Banco real: migrações aplicadas e RLS ativo. Nenhum pagamento real foi efetuado.

Comandos: npm test; npm run typecheck; npm run build; npx playwright test e2e/guest.spec.ts --workers=1.
Cadastro real opt-in: E2E_REAL_REGISTER=1 e --project=desktop. Cria conta QA identificável, transfere foto e rascunho e verifica saída. Testes financeiros usam PGlite isolado, nunca pagamentos fictícios em produção.

Disco cheio interrompeu uma tentativa; limpamos cache e desativamos cache persistente de desenvolvimento. O relatório final registra o resultado da nova execução e da publicação. Backend de produção e webhook dependem das configurações descritas no checklist.


Atualização: o proprietário excluiu o projeto antigo depois dos testes. O novo projeto precisa ser criado em InstaFlow AI, pois o conector não oferece get_cost embora exija confirm_cost_id. Banco, storage, Edge Function e variáveis precisarão ser reinstalados. Build de produção e 49 testes passaram. Cadastro, foto transferida e saída foram verificados antes da exclusão; é obrigatório repetir no banco novo.
`nRodada final: 49 testes de código e 15 testes de navegador passaram; cinco cadastros reais foram intencionalmente pulados na rodada pública. Um cadastro real, transferência de foto e logout passaram separadamente antes da exclusão do banco.
