"use client";
import Link from "next/link";
import { PlanCards } from "@/components/plan-cards";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Download,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { money, paymentLabels, hasPdf } from "@/lib/catalog";
type Order = {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  pdf_files: { id: string }[] | {id:string} | null;
};
export function PaymentPanel({
  catalogId,
  price,
  mode,
  errors = [],
}: {
  catalogId: string;
  price: number;
  mode: "checkout" | "payment";
  errors?: string[];
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [orders, setOrders] = useState<Order[]>([]);
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
        if (verify && !d.orders.some((o: Order) => o.status === "paid"))
          setMessage("Seu pagamento ainda não foi identificado.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Tente novamente.");
      }
    },
    [catalogId],
  );
  useEffect(() => {
    if (mode !== "payment") return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 12000);
    return () => clearInterval(timer);
  }, [mode, refresh]);
  async function checkout() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/catalogs/${catalogId}/checkout`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      location.href = d.redirect;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Tente novamente.");
      setBusy(false);
    }
  }
  async function download(order: Order) {
    setBusy(true);
    setMessage("Preparando seu catálogo com carinho…");
    try {
      const r = await fetch(`/api/orders/${order.id}/download`, {
        method: "POST",
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      const { url } = await r.json();
      const a = document.createElement("a");
      a.href = url;
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
  const paid = orders.filter((o) => o.status === "paid");
  return (
    <div className="checkout card">
      <span className="round-icon">
        <Sparkles size={28} />
      </span>
      <h2 style={{ marginTop: 22 }}>
        {paid.length
          ? "Pagamento aprovado! 🎉"
          : mode === "payment"
            ? "Falta só um passo"
            : "Seu catálogo está pronto! 💅"}
      </h2>
      <p className="muted">
        {paid.length
          ? "Seu catálogo foi liberado. Gere e baixe sua versão profissional."
          : mode === "payment"
            ? "Seu pagamento ainda não foi identificado. Você pode conferir novamente ou continuar para o pagamento."
            : "Seu catálogo profissional está pronto para ser gerado. Faça um pagamento único para liberar o PDF completo em alta qualidade."}
      </p>
      {!paid.length && (
        <>
          <div className="price-big">{money(price)}</div>
          <p className="muted small">Pagamento único · Sem mensalidade</p>
          <div className="feature-list">
            {[
              "PDF profissional",
              "Alta qualidade",
              "Pronto para compartilhar",
              "Pagamento único",
            ].map((v) => (
              <span key={v}>
                <Check size={17} />
                {v}
              </span>
            ))}
          </div>
        </>
      )}
      {errors.length > 0 && (
        <div className="message error" role="alert">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <Link href={`/catalogo/${catalogId}/editar`}>
            <u>Completar meu catálogo</u>
          </Link>
        </div>
      )}
      {message && (
        <div className="message" role="status">
          {message}
        </div>
      )}
      {paid.length ? (
        paid.map((o, i) => (
          <div key={o.id} style={{ marginBottom: 20 }}>
            <p className="small muted">
              Compra de {new Date(o.created_at).toLocaleDateString("pt-BR")} ·{" "}
              {money(o.amount)}
              {i > 0 ? " · versão anterior" : ""}
            </p>
            <button
              className="full"
              disabled={busy}
              onClick={() => download(o)}
            >
              {busy ? (
                <LoaderCircle className="spinning" size={18} />
              ) : (
                <Download size={18} />
              )}{" "}
                {hasPdf(o.pdf_files)
                ? "BAIXAR MEU CATÁLOGO"
                : "GERAR E BAIXAR PDF"}
            </button>
          </div>
        ))
      ) : (
        <>
          <button
            className="full"
            disabled={busy || !!errors.length}
            onClick={checkout}
          >
            {busy && <LoaderCircle className="spinning" size={18} />}LIBERAR MEU
            CATÁLOGO POR {money(price)}
          </button>
          {mode === "payment" && (
            <button
              className="secondary full"
              style={{ marginTop: 12 }}
              onClick={() => void refresh(true)}
              disabled={busy}
            >
              VERIFICAR PAGAMENTO
            </button>
          )}
        </>
      )}
      {orders
        .filter((o) => o.status !== "paid")
        .map((o) => (
          <p key={o.id} className="small muted" style={{ marginTop: 18 }}>
            {paymentLabels[o.status]} · {money(o.amount)}
          </p>
        ))}
      <p className="small muted" style={{ marginTop: 20 }}>
        <LockKeyhole size={13} /> O PDF só é liberado após a confirmação do
        pagamento.
      </p>
      {!paid.length && <PlanCards price={price} compact />}
      <Link className="button ghost" href={`/catalogo/${catalogId}/editar`}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
