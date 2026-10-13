# Checklist de lançamento

## Ambiente

- [ ] Criar/conectar o projeto Supabase exclusivo do produto.
- [ ] Aplicar a migração e executar advisors de segurança no projeto real.
- [ ] Configurar variáveis em homologação e produção separadamente.
- [ ] Configurar domínio HTTPS e `APP_URL` exato.
- [ ] Configurar SMTP, confirmação de e-mail e URLs de retorno.
- [ ] Habilitar proteção contra abuso/captcha no Auth conforme operação.
- [ ] Cadastrar administrador pelo banco, sem role editável pela usuária.
- [ ] Conferir nome, logo, preço e suporte em `/admin/configuracoes`.

## Pagamentos

- [ ] Receber documentação oficial QIpay/Qiapay e implementar o adaptador.
- [ ] Configurar segredos apenas no servidor.
- [ ] Homologar todos os cenários descritos em `GATEWAY.md`.
- [ ] Cadastrar webhook HTTPS e confirmar retries e resposta esperada.
- [ ] Testar concorrência e conciliação após timeout.
- [ ] Habilitar o provider somente após aprovação dos testes.

## Segurança

- [x] RLS definida em todas as tabelas públicas da migração.
- [x] Escrita financeira e administrativa negada aos papéis anon/authenticated.
- [x] Rotas de catálogo, imagem e download verificam a identidade e o proprietário.
- [x] Valor do pedido obtido da configuração do servidor.
- [x] ID único do evento e confirmação transacional.
- [x] Snapshot da compra preservado após editar o catálogo.
- [x] PDF privado, com arquivo aleatório e autorização antes do link de 60 segundos.
- [x] Upload decodificado/regravado, limitação de pixels, remoção de metadados por reencode.
- [x] Sem SDK privilegiado ou segredos no código do navegador.
- [x] Sem aprovação baseada em URL, localStorage ou callback do frontend.
- [ ] Repetir ataques de IDOR usando duas contas reais no Supabase de homologação.
- [ ] Testar isolamento dos buckets reais e acesso direto aos arquivos.
- [ ] Testar assinatura/replay reais do webhook quando o contrato existir.
- [ ] Validar cabeçalhos e limites de tamanho no domínio final.
- [ ] Revisar logs, alertas, backup/restauração e política de retenção.

## Fluxo de cliente

- [ ] Cadastro, confirmação por e-mail, login e recuperação via SMTP real.
- [ ] Upload de logo, retrato, capa e várias fotos reais.
- [ ] Reabrir catálogo salvo, perder conexão, recuperar conexão e testar duas abas.
- [ ] Adicionar/remover serviços e categorias, reordenar e trocar estilos.
- [ ] Pagamento completo de sandbox e geração automática do PDF.
- [ ] Download no Android e iPhone; abertura em leitores de PDF comuns.
- [ ] PDF com muitos serviços, textos longos, fotos verticais/horizontais e links.
- [ ] Expiração de link de download e bloqueio após reembolso.
- [ ] Painel administrativo com dados reais e busca/paginação.

## Privacidade e operação

- [ ] Publicar razão social/CNPJ e contato do controlador.
- [ ] Revisar termos/política, bases legais, retenção, transferências e direitos do titular.
- [ ] Definir processo de exclusão/exportação, resguardando retenções legais.
- [ ] Definir limpeza de imagens órfãs sem remover versões compradas.
- [ ] Monitorar `pdf_jobs` pendentes/falhos e estabelecer retentativas proativas.
- [ ] Testar restauração de backup em ambiente separado.
- [ ] Confirmar custo e capacidade dos provedores para volume esperado.
- [ ] Promover a versão homologada para produção e executar smoke test final.

**Estado:** a base está implementada e testada localmente; a operação comercial aguarda conexão dos serviços e homologação real. Checklists marcados acima indicam implementação e testes locais, não auditoria da infraestrutura externa ainda ausente.
