import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { money } from "@/lib/catalog";
import { OFFERS } from "@/lib/offers";

export function PlanCards({ price, compact = false }: { price: number; compact?: boolean }) {
  return (
    <section className={compact ? "plan-section compact" : "section plan-section"} aria-label="Opções de pagamento" id={compact ? undefined : "planos"}>
      <div className="center">
        <div className="eyebrow">UM CATÁLOGO QUE ACOMPANHA VOCÊ</div>
        <h2>Escolha o que combina com seu momento</h2>
      </div>
      <div className="plans-grid">
        <article className="card plan-card">
          <span className="eyebrow">PARA UMA VERSÃO DO SEU CATÁLOGO</span>
          <h3>Catálogo avulso</h3>
          <p className="plan-price">{money(price)} <span>uma vez</span></p>
          <p className="muted">Seu catálogo profissional em PDF, pronto para enviar às clientes.</p>
          <ul><li><Check size={16} /> PDF da versão adquirida</li><li><Check size={16} /> Pagamento único, sem mensalidade</li></ul>
          <Link className="button secondary full" href="/catalogo/novo">Começar catálogo avulso</Link>
          <details className="checkout-details"><summary>Ver link de pagamento avulso</summary><CheckoutNotice href={OFFERS.single.checkoutUrl} /></details>
        </article>
        <article className="card plan-card monthly-plan">
          <span className="eyebrow"><RefreshCw size={14} /> PARA MANTER TUDO ATUALIZADO</span>
          <h3>Seu catálogo sempre à mão</h3>
          <p className="plan-price">{money(OFFERS.monthly.priceCents)} <span>/ mês</span></p>
          <p className="muted">Uma opção para manter seu catálogo disponível e editar fotos, serviços e preços enquanto a assinatura estiver ativa.</p>
          <ul><li><Check size={16} /> Catálogo salvo para continuar editando</li><li><Check size={16} /> Cobrança mensal recorrente</li></ul>
          <details className="checkout-details"><summary className="button full">Conhecer assinatura mensal</summary><CheckoutNotice href={OFFERS.monthly.checkoutUrl} /></details>
          <p className="small muted">Ativação automática da assinatura em configuração.</p>
        </article>
      </div>
    </section>
  );
}

function CheckoutNotice({ href }: { href: string }) {
  return <div className="message"><p>A liberação automática ainda está em configuração. Aguarde a abertura das vendas antes de pagar: este link, sozinho, não ativa o catálogo nem libera o PDF.</p><a href={href} target="_blank" rel="noopener noreferrer" className="text-link">Consultar checkout externo ↗</a></div>;
}
