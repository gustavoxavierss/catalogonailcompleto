import { Header, Footer } from "@/components/chrome";
import { settings } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function Privacy() {
  const s = await settings();
  return (
    <>
      <Header name={s.name} />
      <main className="shell page legal">
        <h1>Política de Privacidade</h1>
        <p className="muted">Versão de 13 de outubro de 2026</p>
        <p>
          Esta política explica o tratamento de informações na {s.name}. Antes
          da abertura comercial, a identificação jurídica da empresa responsável
          e seu canal de atendimento devem estar publicados nesta página.
        </p>
        <h2>Informações utilizadas</h2>
        <p>
          Usamos nome e e-mail para sua conta; fotos, textos e contatos
          fornecidos por você para montar catálogos; e registros de pedidos para
          controlar a liberação do PDF. A senha é gerenciada pelo serviço de
          autenticação. Não solicitamos dados de saúde nem dados de cartão no
          editor.
        </p>
        <h2>Finalidades e compartilhamento</h2>
        <p>
          Tratamos dados para executar o serviço solicitado, proteger contas e
          cumprir obrigações aplicáveis. Supabase armazena contas e arquivos; o
          provedor de hospedagem executa a aplicação. O gateway escolhido
          processará pagamentos sob sua própria política. Esses fornecedores
          podem operar fora do Brasil.
        </p>
        <h2>Privacidade do catálogo</h2>
        <p>
          Você escolhe os contatos que serão exibidos. A prévia e os arquivos da
          conta exigem autenticação. Depois de baixar e compartilhar um PDF,
          você controla sua distribuição; cópias enviadas a terceiros não podem
          ser recolhidas pela plataforma.
        </p>
        <h2>Cookies e métricas</h2>
        <p>
          Usamos cookies necessários à sessão e registros internos de criação,
          pagamento e download para acompanhar o funcionamento e a conversão.
          Não implementamos publicidade comportamental.
        </p>
        <h2>Conservação e direitos</h2>
        <p>
          Os dados são mantidos enquanto necessários ao serviço e às obrigações
          aplicáveis. Você pode solicitar acesso, correção, informações sobre
          compartilhamento ou eliminação, observadas as hipóteses legais de
          conservação. Pedidos são analisados com verificação de identidade.
        </p>
        <h2>Contato</h2>
        {s.supportEmail ? (
          <p>
            Envie sua solicitação para{" "}
            <a href={`mailto:${s.supportEmail}`}>
              <u>{s.supportEmail}</u>
            </a>
            .
          </p>
        ) : (
          <p>
            O canal de atendimento será publicado antes do início da operação
            comercial.
          </p>
        )}
        <p className="small muted">
          Referência:{" "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <u>Lei Geral de Proteção de Dados Pessoais</u>
          </a>
          .
        </p>
      </main>
      <Footer name={s.name} />
    </>
  );
}
