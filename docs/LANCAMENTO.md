# Checklist de lançamento

## Configurado
Site e GitHub existentes; esquema nail_catalog com RLS e ponte assinada prontos para reinstalação; editor sem conta e importação; planos avulso e mensal; adaptador Wiapy; proteção de PDF e período mensal. O banco anterior foi excluído pelo proprietário.

## Pendências obrigatórias
- Autorizar armazenamento de SUPABASE_BRIDGE_PRIVATE_KEY no projeto catalogonailcompleto da Vercel, ambiente production. A revisão automática bloqueou o envio desse segredo; nenhum contorno foi usado.
- Configurar token forte no painel Wiapy e o mesmo QIAPAY_WEBHOOK_SECRET na Vercel; ativar PAYMENT_PROVIDER=wiapy.
- Homologar compra real, renovação, recusa, estorno e evento duplicado.
- Validar recuperação por e-mail com SMTP e redirects de produção.
- Ativar proteção contra senhas vazadas no Supabase, se disponível.
- Definir administrador, suporte e identificação da empresa nos termos/privacidade.
- Definir backup, retenção, alertas e limpeza de arquivos órfãos.
- Liberar espaço no notebook para desenvolvimento contínuo; só cache deste projeto foi removido.

## Segurança
Não expor service role/chave privada. Não liberar PDF por callback. Manter RLS, buckets privados, HTTPS e cookies seguros. Validar conta cruzada, PDF sem pagamento, webhook forjado e admin sem permissão. Revisar privilégios legados do hotel antes de compartilhar esse projeto com outros produtos.

O domínio público respondeu HTTP 200; não é necessário desligar SSO da conta Vercel para acessá-lo. Site público não significa backend e cobrança ativados.


Atualização: sistemahotelsp foi excluído pelo proprietário. Criar catalogonailcompleto em InstaFlow AI e reinstalar o banco/função antes de ativar produção. Nenhuma tabela do projeto anterior continua disponível após essa exclusão.

