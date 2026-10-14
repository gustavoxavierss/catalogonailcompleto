"use client";
import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { money } from "@/lib/catalog";
import { OFFERS } from "@/lib/offers";
export function PlanCards({
  price,
  compact = false,
  onChoose,
  disabled = false,
}: {
  price: number;
  compact?: boolean;
  onChoose?: (plan: "single" | "monthly") => void;
  disabled?: boolean;
}) {
  return (
    <section
      className={compact ? "plan-section compact" : "section plan-section"}
      aria-label="Opções de pagamento"
      id={compact ? undefined : "planos"}
    >
      <div className="center">
        <div className="eyebrow">UM CATÁLOGO QUE ACOMPANHA VOCÊ</div>
        <h2>Escolha o que combina com seu momento</h2>
        <p className="muted">
          Crie primeiro. Escolha seu plano quando estiver tudo do seu jeito.
        </p>
      </div>
      <div className="plans-grid">
        {(["single", "monthly"] as const).map((plan) => {
          const monthly = plan === "monthly";
          return (
            <article
              key={plan}
              className={`card plan-card ${monthly ? "monthly-plan" : ""}`}
            >
              <span className="eyebrow">
                {monthly ? (
                  <>
                    <RefreshCw size={14} /> SEMPRE ATUALIZADO
                  </>
                ) : (
                  "UMA VERSÃO PARA COMPARTILHAR"
                )}
              </span>
              <h3>
                {monthly ? "Seu catálogo sempre à mão" : "Catálogo avulso"}
              </h3>
              <p className="plan-price">
                {money(monthly ? OFFERS.monthly.priceCents : price)}{" "}
                <span>{monthly ? "/ mês" : "uma vez"}</span>
              </p>
              <p className="muted">
                {monthly
                  ? "Atualize fotos, serviços e preços, e gere novas versões enquanto sua assinatura estiver ativa."
                  : "Baixe o PDF da versão que você criou e envie para suas clientes."}
              </p>
              <ul>
                <li>
                  <Check size={16} /> PDF profissional
                </li>
                <li>
                  <Check size={16} />{" "}
                  {monthly
                    ? "Edições e novas versões durante a assinatura"
                    : "Pagamento único, sem mensalidade"}
                </li>
                <li>
                  <Check size={16} />{" "}
                  {monthly
                    ? "Cobrança mensal recorrente"
                    : "Uma versão do catálogo por compra"}
                </li>
              </ul>
              {onChoose ? (
                <button
                  className={`full ${monthly ? "" : "secondary"}`}
                  disabled={disabled}
                  onClick={() => onChoose(plan)}
                >
                  {monthly ? "ESCOLHER PLANO MENSAL" : "LIBERAR MEU CATÁLOGO"}
                </button>
              ) : (
                <Link
                  className={`button full ${monthly ? "" : "secondary"}`}
                  href="/catalogo/novo"
                >
                  Criar meu catálogo
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
