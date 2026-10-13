import { Header, Footer } from "@/components/chrome";
import { settings } from "@/lib/server";
import { money } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Terms() {
  const s = await settings();
  return (
    <>
      <Header name={s.name} />
      <main className="shell page legal">
        <h1>Termos de Uso</h1>
        <p className="muted">Versão de 13 de outubro de 2026</p>
        <p>
          A {s.name} permite criar catálogos profissionais com conteúdo
          fornecido por você. A identificação jurídica da empresa responsável
          deve ser publicada antes da abertura comercial.
        </p>
        <h2>Sua conta e seu conteúdo</h2>
        <p>
          Informe dados corretos, proteja sua senha e envie apenas imagens e
          textos que tenha autorização para utilizar. Você é responsável pela
          precisão dos serviços, valores e contatos do seu catálogo. Não envie
          conteúdo ilegal ou que viole direitos de terceiros.
        </p>
        <h2>Criação, prévia e compra</h2>
        <p>
          Você pode editar e visualizar a prévia antes de comprar. A liberação
          custa atualmente {money(s.priceCents)}, em pagamento único por versão
          do catálogo, sem mensalidade. O preço final é apresentado antes do
          pagamento e registrado no pedido.
        </p>
        <h2>Liberação e alterações</h2>
        <p>
          O PDF é gerado somente após a confirmação real do pagamento. Retornar
          do checkout não significa aprovação. A compra corresponde à versão
          registrada no pedido; alterações posteriores podem exigir uma nova
          compra. O PDF utiliza diagramação A4 própria, com possíveis diferenças
          de paginação em relação à prévia.
        </p>
        <h2>Problemas e atendimento</h2>
        <p>
          Se o pagamento for aprovado e o arquivo não estiver disponível, entre
          em contato com o suporte. Solicitações de cancelamento, reembolso e
          direitos do consumidor serão analisadas conforme a legislação
          aplicável. Estes termos não limitam direitos previstos em lei.
        </p>
        <h2>Disponibilidade</h2>
        <p>
          Podem ocorrer interrupções para manutenção ou falhas de fornecedores.
          Aguarde a indicação “Salvo” antes de fechar o editor. Uma vez baixado,
          mantenha uma cópia do PDF.
        </p>
        <h2>Contato</h2>
        {s.supportEmail ? (
          <p>
            <a href={`mailto:${s.supportEmail}`}>
              <u>{s.supportEmail}</u>
            </a>
          </p>
        ) : (
          <p>
            O contato de atendimento será publicado antes da operação comercial.
          </p>
        )}
      </main>
      <Footer name={s.name} />
    </>
  );
}
