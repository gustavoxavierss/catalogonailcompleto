# Catálogo digital — imagens em destaque

## Causa corrigida
A prévia anterior usava object-fit: contain indiscriminadamente, retrato de 120 × 150 px, fotos de serviços com altura de 210 px e duas colunas em uma área limitada a 790 px. A API também limitava todas as respostas a 720 × 720, prejudicando especialmente screenshots verticais.

## Estrutura
- CatalogPreview controla capa, serviços, apresentação, portfólio e contatos em seções independentes, sem empilhar todas no mesmo fluxo.
- CatalogMedia identifica proporções horizontais, quadradas, verticais, muito verticais e panorâmicas. Imagens estreitas mantêm o conteúdo inteiro, em largura ampla, sobre fundo derivado da própria foto. Fotografias comuns usam cover sem deformação; a imagem completa está disponível no visualizador.
- Serviços alternam três composições. Em celulares, a foto principal ocupa a largura útil (aproximadamente viewport menos 32 px); no desktop, imagens e informações usam composições 60/40, alternadas e panorâmicas.
- Detalhes em dialog nativo com foco contido, Escape e restauração de foco. Fotos em tela cheia, zoom de 100% a 400%, pinça, arraste, deslize, setas e navegação por teclado.
- Link de agendamento prioriza o contato de agendamento e usa WhatsApp como alternativa. Contatos desativados continuam ocultos. Localização abre busca no mapa.

## Imagens e compatibilidade
Uploads continuam no storage privado e no formato JPEG usado pelo PDF, com orientação EXIF corrigida, qualidade 90 e limite de 2400 × 6400, sem ampliar artificialmente arquivos menores. Dimensões são adicionadas opcionalmente ao documento; fotos antigas são classificadas após carregar e continuam válidas, sem migração.

A rota autenticada de imagens oferece WebP nas larguras 320, 640, 960, 1440, 2048 e 2400. O navegador escolhe pelo srcset. O editor solicita 320; a galeria ampliada solicita até 2400. Autenticação e propriedade são conferidas antes de cada resposta, com cache privado/no-store. Nenhum caminho de storage foi tornado público.

Fotografias de baixa resolução continuam limitadas pelo arquivo de origem. Nenhuma reconstrução por IA ou alteração do resultado do serviço foi aplicada.

O PDF tem implementação independente. Usa imagens maiores, composição de fundo para proporções estreitas e reserva espaço para preço, duração e observações. Arquivos já emitidos continuam vinculados à versão comprada; a nova diagramação vale para novas gerações.

## Verificação
- 57 testes de código/banco/pagamento/PDF passaram. PDF de seis formatos validado com nove páginas A4, sem observações órfãs, e renderizado para inspeção visual.
- Dez testes do editor e da apresentação passaram em 375, 390 e 430 px, tablet e desktop, incluindo orientação, largura das fotos, galeria com três imagens, pinça, deslize, zoom, Escape, WhatsApp, mapa e ausência de rolagem horizontal.
- Na aplicação real: cadastro de QA, oito uploads, variantes WebP de 320/1440, screenshot preservado com 1500 px de altura, bloqueio anônimo e salvamento de seis serviços passaram. Prévia e apresentação verificadas em 360, 375, 390, 393, 412, 430, 768 e 1440 px, incluindo imagem legada sem dimensões.
- Fluxo real de visitante, cadastro, importação de foto/rascunho, prévia, planos, logout e novo login passou. Foi protegido o envio de formulários antes da hidratação, detectado no teste com carregamento lento.
- Testes financeiros continuam isolados; nenhum pagamento aprovado foi simulado no servidor de produção.

## Repetição
Gerar imagens de teste: `node scripts/image-fixtures.mjs`.
Ambiente isolado: `npx vite --config vite.ui.config.ts`.
Teste visual: `npx playwright test e2e/catalog-visual.spec.ts e2e/editor.spec.ts --workers=1`.
Teste conectado opt-in: configurar E2E_BASE_URL e E2E_IMAGE_QA=1 e executar `e2e/catalog-connected-visual.spec.ts --project=desktop`.
Verificação de conta e pagamentos: e2e/guest.spec.ts com E2E_REAL_REGISTER=1 e E2E_PAYMENTS_READY=1 quando o gateway estiver habilitado.
