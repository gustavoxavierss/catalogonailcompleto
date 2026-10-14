"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Download,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { PlanCards } from "./plan-cards";
import { money, paymentLabels, hasPdf } from "@/lib/catalog";
type Order = {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  pdf_files: { id: string }[] | { id: string } | null;
  plan: string;
  isCurrent: boolean;
};
export function PaymentPanel({
  catalogId,
  price,
  mode,
  errors = [],
  paymentsReady = false,
}: {
  catalogId: string;
  price: number;
  mode: "checkout" | "payment";
  errors?: string[];
  paymentsReady?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [orders, setOrders] = useState<Order[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState(""),
    [waiting, setWaiting] = useState(mode === "payment"),
    [active, setActive] = useState(false);
  const refresh = useCallback(
    async (verify = false) => {
      try {
        const r = await fetch(`/api/catalogs/${catalogId}/payment`, {
          method: verify ? "POST" : "GET",
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setOrders(d.orders);
        setActive(d.subscriptionActive);
        if (
          verify &&
          !d.orders.some((o: Order) => o.status === "paid" && o.isCurrent)
        )
          setMessage(
            "Seu pagamento ainda não foi identificado. Assim que a confirmação chegar, seu PDF será liberado aqui.",
          );
      } catch {
        setMessage(
          "Não conseguimos atualizar o pagamento agora. Tente novamente em instantes.",
        );
      }
    },
    [catalogId],
  );
  useEffect(() => {
    void refresh();
    if (!waiting) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 12000);
    return () => clearInterval(t);
  }, [refresh, waiting]);
  async function checkout(plan: "single" | "monthly") {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/catalogs/${catalogId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.redirect) {
        location.href = d.redirect;
        return;
      }
      setCheckoutUrl(d.checkoutUrl);
      setWaiting(true);
      setMessage(
        "Seu pedido foi salvo. Abra o pagamento abaixo; esta página acompanhará a confirmação automaticamente.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function download(o: Order) {
    setBusy(true);
    setMessage("Preparando seu catálogo com carinho…");
    try {
      const r = await fetch(`/api/orders/${o.id}/download`, { method: "POST" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const a = document.createElement("a");
      a.href = d.url;
      a.download = "meu-catalogo.pdf";
      a.click();
      setMessage("Seu download foi iniciado. Agora é só compartilhar!");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const paid = orders.filter((o) => o.status === "paid"),
    current = paid.some((o) => o.isCurrent);
  return (
    <div className="card checkout" style={{ maxWidth: 1000 }}>
      <span className="round-icon">
        <Sparkles size={28} />
      </span>
      <h2 style={{ marginTop: 22 }}>
        {current ? "Pagamento aprovado! 🎉" : "Seu catálogo está pronto! 💅"}
      </h2>
      <p className="muted">
        {current
          ? "Seu catálogo foi liberado. Agora é só baixar e compartilhar."
          : "Escolha o pagamento único ou a assinatura mensal para gerar e baixar seu PDF profissional."}
      </p>
      {errors.length > 0 && (
        <div className="message error" role="alert">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <Link href={`/catalogo/${catalogId}/editar`}>
            Completar meu catálogo
          </Link>
        </div>
      )}
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      {!paymentsReady && !active && !current && (
        <p className="message">
          A liberação do PDF estará disponível em breve. Seu catálogo já está
          salvo e você pode continuar editando.
        </p>
      )}
      {active && !current && (
        <button
          className="full"
          disabled={busy || !!errors.length}
          onClick={() => checkout("monthly")}
        >
          <Check size={18} /> Gerar esta versão com minha assinatura
        </button>
      )}
      {!current && !active && (
        <PlanCards
          compact
          price={price}
          onChoose={checkout}
          disabled={busy || !!errors.length || !paymentsReady}
        />
      )}
      {checkoutUrl && !current && (
        <a
          className="button full"
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          ABRIR PAGAMENTO SEGURO ↗
        </a>
      )}
      {waiting && !current && (
        <button
          className="secondary full"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={() => void refresh(true)}
        >
          VERIFICAR PAGAMENTO
        </button>
      )}
      {paid.map((o) => (
        <div key={o.id} className="message">
          <p>
            {o.isCurrent ? "Seu catálogo atual" : "Versão anterior"} ·{" "}
            {money(o.amount)}
            {o.plan === "monthly_access" ? " · incluída na assinatura" : ""}
          </p>
          <button className="full" disabled={busy} onClick={() => download(o)}>
            {busy ? (
              <LoaderCircle className="spinning" size={18} />
            ) : (
              <Download size={18} />
            )}{" "}
            {hasPdf(o.pdf_files) ? "BAIXAR MEU CATÁLOGO" : "GERAR E BAIXAR PDF"}
          </button>
        </div>
      ))}
      {orders
        .filter((o) => o.status !== "paid")
        .map((o) => (
          <p className="small muted" key={o.id}>
            {paymentLabels[o.status]} · {money(o.amount)}
          </p>
        ))}
      <p className="small muted" style={{ marginTop: 20 }}>
        <LockKeyhole size={13} /> O PDF só é liberado após confirmação real do
        pagamento.
      </p>
      <Link className="button ghost" href={`/catalogo/${catalogId}/editar`}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
