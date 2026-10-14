"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Catalog, contactHref, money } from "@/lib/catalog";
import { useImageSource } from "./guest-context";
export function CatalogPreview({ document: d }: { document: Catalog }) {
  const imageSource = useImageSource();
  const [qr, setQr] = useState("");
  const target = d.contacts.find(
    (c) => c.visible && c.value && c.kind === d.qr,
  );
  const href = target ? contactHref(target, d.whatsappMessage) : "";
  useEffect(() => {
    let active = true;
    if (href)
      QRCode.toDataURL(href, { width: 160, margin: 1 }).then((v) => {
        if (active) setQr(v);
      });
    else setQr("");
    return () => {
      active = false;
    };
  }, [href]);
  return (
    <div
      className="catalog-preview"
      style={
        {
          "--cat-primary": d.theme.primary,
          "--cat-secondary": d.theme.secondary,
          "--cat-heading": d.theme.heading,
          fontFamily:
            d.theme.font === "serif" ? "Georgia, serif" : "Arial, sans-serif",
        } as React.CSSProperties
      }
    >
      <span className="preview-watermark">PRÉVIA</span>
      <section className="catalog-cover">
        {d.logo && (
          <img
            className="catalog-logo"
            src={imageSource(d.logo.id)}
            alt="Logotipo"
          />
        )}
        <p className="eyebrow" style={{ color: d.theme.heading }}>
          CATÁLOGO DE SERVIÇOS
        </p>
        <h1>{d.business || d.professional || "Seu nome aqui"}</h1>
        {d.business && <p>{d.professional}</p>}
        {d.cover && (
          <img
            className="cover"
            src={imageSource(d.cover.id)}
            alt="Capa do catálogo"
          />
        )}
        <p style={{ marginTop: 25, color: d.theme.heading }}>
          Cuidado, beleza e um momento só seu.
        </p>
      </section>
      <section className="catalog-section catalog-about">
        {d.portrait && (
          <img
            className="portrait"
            src={imageSource(d.portrait.id)}
            alt={d.professional}
          />
        )}
        <div>
          <h2>Prazer em conhecer você</h2>
          <p style={{ whiteSpace: "pre-line" }}>
            {d.about || "Sua apresentação aparecerá aqui."}
          </p>
          {d.specialties && (
            <p>
              <strong>Especialidades</strong>
              <br />
              {d.specialties}
            </p>
          )}
        </div>
      </section>
      {[...d.categories, { id: null, name: "Outros serviços" }].map((cat) => {
        const services = d.services.filter((s) => s.categoryId === cat.id);
        if (!services.length) return null;
        return (
          <section key={cat.id || "none"} className="catalog-section">
            <h2>{cat.name}</h2>
            <div className="preview-services">
              {services.map((s) => (
                <article
                  className="preview-service"
                  key={s.id}
                  style={{
                    background: d.theme.card === "clean" ? "white" : undefined,
                    border:
                      d.theme.card === "outlined"
                        ? `1px solid ${d.theme.primary}`
                        : undefined,
                    borderRadius: d.theme.imageShape === "rounded" ? 14 : 0,
                  }}
                >
                  {s.images[0] && (
                    <img
                      src={imageSource(s.images[0].id)}
                      alt={s.name}
                      style={{
                        borderRadius: d.theme.imageShape === "rounded" ? 8 : 0,
                      }}
                    />
                  )}
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  {s.promotion !== null && (
                    <div className="old-price">{money(s.price)}</div>
                  )}
                  <div className="price">{money(s.promotion ?? s.price)}</div>
                  {s.duration && <p>Duração: {s.duration}</p>}
                  {s.note && <p className="muted">{s.note}</p>}
                  {s.images.length > 1 && (
                    <div className="gallery">
                      {s.images.slice(1).map((i) => (
                        <img
                          key={i.id}
                          src={imageSource(i.id)}
                          alt={s.name}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <section
        className="catalog-section center"
        style={{ background: d.theme.secondary }}
      >
        <h2>Gostou de algum serviço?</h2>
        <p>Entre em contato comigo e agende seu horário.</p>
        <div className="catalog-contacts">
          {d.contacts
            .filter((c) => c.visible && c.value)
            .map((c) => (
              <a
                key={c.id}
                href={contactHref(c, d.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.label || c.kind}
              </a>
            ))}
        </div>
        {d.address.visible && (
          <p style={{ marginTop: 20 }}>
            {[
              d.address.street,
              d.address.district,
              d.address.city,
              d.address.state,
              d.address.zip,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {qr && (
          <img
            src={qr}
            alt="QR Code para agendamento"
            width={140}
            height={140}
            style={{ margin: "25px auto" }}
          />
        )}
      </section>
    </div>
  );
}
