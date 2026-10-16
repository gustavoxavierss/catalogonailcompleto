"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Expand,
  MapPin,
  MessageCircle,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import QRCode from "qrcode";
import {
  Catalog,
  CatalogImage,
  contactHref,
  money,
  readableColor,
} from "@/lib/catalog";
import { useImageSource } from "./guest-context";
import { CatalogMedia } from "./catalog-media";
import styles from "./catalog-digital.module.css";

type Service = Catalog["services"][number];
type Section = "cover" | "services" | "about" | "portfolio" | "contact";
type Viewer = { images: CatalogImage[]; index: number; title: string };

function PhotoViewer({
  value,
  onChange,
  onClose,
}: {
  value: Viewer;
  onChange: (v: Viewer) => void;
  onClose: () => void;
}) {
  const source = useImageSource();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const points = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ x: 0, y: 0, distance: 0, zoom: 1 });
  const move = (delta: number) => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onChange({
      ...value,
      index: (value.index + delta + value.images.length) % value.images.length,
    });
  };
  const zoomTo = (next: number) => {
    setZoom(Math.min(4, Math.max(1, next)));
    setPan({ x: 0, y: 0 });
  };
  return (
    <div
      className={styles.viewer}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <div className={styles.viewerBar}>
        <span>
          {value.title} · {value.index + 1}/{value.images.length}
        </span>
        <button onClick={onClose} aria-label="Fechar fotografia">
          <X />
        </button>
      </div>
      <div
        className={styles.zoomStage}
        data-zoom={zoom}
        onDoubleClick={() => zoomTo(zoom > 1 ? 1 : 2)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (points.current.size === 1)
            start.current = { x: e.clientX, y: e.clientY, distance: 0, zoom };
          if (points.current.size === 2) {
            const [a, b] = [...points.current.values()];
            start.current.distance = Math.hypot(a.x - b.x, a.y - b.y);
            start.current.zoom = zoom;
          }
        }}
        onPointerMove={(e) => {
          const old = points.current.get(e.pointerId);
          if (!old) return;
          points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (points.current.size === 2 && start.current.distance) {
            const [a, b] = [...points.current.values()];
            setZoom(
              Math.min(
                4,
                Math.max(
                  1,
                  (start.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                    start.current.distance,
                ),
              ),
            );
          } else if (zoom > 1)
            setPan((p) => ({
              x: p.x + e.clientX - old.x,
              y: p.y + e.clientY - old.y,
            }));
        }}
        onPointerUp={(e) => {
          if (
            points.current.size === 1 &&
            zoom === 1 &&
            !start.current.distance
          ) {
            const delta = e.clientX - start.current.x;
            if (
              Math.abs(delta) > 55 &&
              Math.abs(e.clientY - start.current.y) < 90
            )
              move(delta < 0 ? 1 : -1);
          }
          points.current.delete(e.pointerId);
        }}
        onPointerCancel={() => points.current.clear()}
      >
        <img
          src={source(value.images[value.index].id, 2400)}
          alt={`${value.title}, foto ${value.index + 1}`}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        />
      </div>
      <div className={styles.viewerControls}>
        <button
          aria-label="Foto anterior"
          disabled={value.images.length < 2}
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </button>
        <button
          aria-label="Diminuir zoom"
          onClick={() => zoomTo(zoom - 0.5)}
          disabled={zoom === 1}
        >
          <ZoomOut />
        </button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Aumentar zoom"
          onClick={() => zoomTo(zoom + 0.5)}
          disabled={zoom === 4}
        >
          <ZoomIn />
        </button>
        <button
          aria-label="Próxima foto"
          disabled={value.images.length < 2}
          onClick={() => move(1)}
        >
          <ChevronRight />
        </button>
      </div>
      <p className={styles.viewerHint}>
        Deslize para trocar · Use dois dedos ou os botões para ampliar
      </p>
    </div>
  );
}

export function CatalogPreview({ document: d }: { document: Catalog }) {
  const imageSource = useImageSource();
  const [section, setSection] = useState<Section>("cover");
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<Service | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [qr, setQr] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const modalOpen = !!(detail || viewer);
  const contacts = d.contacts.filter((c) => c.visible && c.value);
  const booking =
    contacts.find((c) => c.kind === "booking") ||
    contacts.find((c) => c.kind === "whatsapp");
  const whatsapp = contacts.find((c) => c.kind === "whatsapp");
  const bookingHref = booking ? contactHref(booking, d.whatsappMessage) : "";
  const target = contacts.find((c) => c.kind === d.qr);
  const qrHref = target ? contactHref(target, d.whatsappMessage) : "";
  const colors = {
    "--cat-primary": d.theme.primary,
    "--cat-secondary": d.theme.secondary,
    "--cat-heading": d.theme.heading,
    "--cat-on-primary": readableColor(d.theme.primary),
    "--cat-on-secondary": readableColor(d.theme.secondary),
    "--cat-radius": d.theme.imageShape === "rounded" ? "18px" : "0px",
    "--cat-font":
      d.theme.font === "serif"
        ? '"Playfair Display Variable", Georgia, serif'
        : '"DM Sans Variable", Arial, sans-serif',
  } as CSSProperties;
  useEffect(() => {
    let active = true;
    if (qrHref)
      QRCode.toDataURL(qrHref, { width: 180, margin: 1 })
        .then((v) => {
          if (active) setQr(v);
        })
        .catch(() => {
          if (active) setQr("");
        });
    else setQr("");
    return () => {
      active = false;
    };
  }, [qrHref]);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const active = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previous;
      active?.focus({ preventScroll: true });
    };
  }, [modalOpen]);
  function navigate(next: Section) {
    setSection(next);
    requestAnimationFrame(() =>
      nav.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
  }
  const openPhoto = (images: CatalogImage[], title: string, index = 0) =>
    setViewer({ images, title, index });
  const address = [
    d.address.street,
    d.address.district,
    d.address.city,
    d.address.state,
    d.address.zip,
  ]
    .filter(Boolean)
    .join(" · ");
  const price = (s: Service) => (
    <div className={styles.priceLine}>
      {s.promotion !== null && <del>{money(s.price)}</del>}
      <strong>{money(s.promotion ?? s.price)}</strong>
      {s.duration && (
        <span>
          <Clock size={15} />
          {s.duration}
        </span>
      )}
    </div>
  );
  const schedule = (
    <a
      className={styles.schedule}
      href={bookingHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      AGENDAR HORÁRIO <ArrowRight size={17} />
    </a>
  );
  const tabs: [Section, string][] = [
    ["cover", "Início"],
    ["services", "Serviços"],
    ["about", "Conheça-me"],
    ["portfolio", "Portfólio"],
    ["contact", "Localização e contato"],
  ];
  return (
    <div
      ref={root}
      className={`catalog-preview ${styles.catalog}`}
      style={colors}
      data-template={d.theme.template}
    >
      <span className={styles.watermark}>PRÉVIA</span>
      {section === "cover" && (
        <section className={styles.cover}>
          {(d.cover || d.portrait) && (
            <CatalogMedia
              key={(d.cover || d.portrait)!.id}
              image={(d.cover || d.portrait)!}
              alt="Capa do catálogo"
              role="cover"
              eager
              onOpen={() =>
                openPhoto([(d.cover || d.portrait)!], "Capa do catálogo")
              }
            />
          )}
          <div className={styles.coverCopy}>
            {d.logo && (
              <img
                className={styles.logo}
                src={imageSource(d.logo.id, 320)}
                alt="Logotipo"
              />
            )}
            <span className={styles.eyebrow}>CATÁLOGO DE SERVIÇOS</span>
            <h1>{d.business || d.professional || "Seu nome aqui"}</h1>
            {d.business && <p>{d.professional}</p>}
            <p>Cuidado, beleza e um momento só seu.</p>
            <button
              className={styles.schedule}
              onClick={() => navigate("services")}
            >
              VER SERVIÇOS <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      <nav
        ref={nav}
        className={styles.navigation}
        aria-label="Navegação do catálogo"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(key)}
            aria-current={section === key ? "page" : undefined}
          >
            {label}
          </button>
        ))}
        {whatsapp && (
          <a
            href={contactHref(whatsapp, d.whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        )}
      </nav>
      <div key={section} className={styles.panel}>
        {section === "services" && (
          <section aria-label="Serviços do catálogo">
            <header className={styles.sectionTitle}>
              <span className={styles.eyebrow}>
                FEITO COM CUIDADO, PARA VOCÊ
              </span>
              <h2>Escolha seu próximo cuidado</h2>
              <p>
                Conheça os serviços e toque nas fotos para ver cada detalhe.
              </p>
              {d.categories.some((c) =>
                d.services.some((s) => s.categoryId === c.id),
              ) && (
                <label className={styles.categoryLabel}>
                  Categoria
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">Todos os serviços</option>
                    {d.categories
                      .filter((c) =>
                        d.services.some((s) => s.categoryId === c.id),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    {d.services.some((s) => !s.categoryId) && (
                      <option value="other">Outros serviços</option>
                    )}
                  </select>
                </label>
              )}
            </header>
            {!d.services.length && (
              <p className={styles.empty}>
                Seus serviços aparecerão aqui quando você adicioná-los.
              </p>
            )}
            <div className={styles.services}>
              {[...d.categories, { id: null, name: "Outros serviços" }]
                .flatMap((cat) =>
                  d.services
                    .filter(
                      (s) =>
                        s.categoryId === cat.id &&
                        (category === "all" ||
                          category === (cat.id || "other")),
                    )
                    .map((s) => ({ s, cat })),
                )
                .map(({ s, cat }, index) => (
                  <article
                    key={s.id}
                    className={`${styles.service} ${styles[`composition${index % 3}`]}`}
                    data-card={d.theme.card}
                  >
                    {s.images[0] && (
                      <CatalogMedia
                        key={s.images[0].id}
                        image={s.images[0]}
                        alt={s.name}
                        onOpen={() => openPhoto(s.images, s.name)}
                      />
                    )}
                    <div className={styles.serviceInfo}>
                      <span className={styles.eyebrow}>
                        {String(index + 1).padStart(2, "0")} / {cat.name}
                      </span>
                      <h3>
                        <button
                          className={styles.titleButton}
                          onClick={() => setDetail(s)}
                        >
                          {s.name || "Seu serviço"}
                        </button>
                      </h3>
                      <p className={styles.description}>{s.description}</p>
                      {price(s)}
                      <div className={styles.serviceActions}>
                        <button
                          className={styles.detailsButton}
                          onClick={() => setDetail(s)}
                        >
                          Ver detalhes <Expand size={15} />
                        </button>
                        {bookingHref && schedule}
                      </div>
                      {s.images.length > 1 && (
                        <button
                          className={styles.photoCount}
                          onClick={() => openPhoto(s.images, s.name)}
                        >
                          Ver as {s.images.length} fotos{" "}
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        {section === "about" && (
          <section className={styles.about} aria-label="Sobre a profissional">
            {d.portrait && (
              <CatalogMedia
                image={d.portrait}
                alt={d.professional || "Foto da profissional"}
                role="portrait"
                onOpen={() =>
                  openPhoto([d.portrait!], d.professional || "Sobre mim")
                }
              />
            )}
            <div className={styles.aboutCopy}>
              <span className={styles.eyebrow}>{d.professional}</span>
              <h2>Prazer em conhecer você</h2>
              <p>{d.about || "Sua apresentação aparecerá aqui."}</p>
              {d.specialties && (
                <>
                  <h3>Especialidades</h3>
                  <p>{d.specialties}</p>
                </>
              )}
              {bookingHref && schedule}
            </div>
          </section>
        )}
        {section === "portfolio" && (
          <section aria-label="Portfólio">
            <header className={styles.sectionTitle}>
              <span className={styles.eyebrow}>MEU TRABALHO, DE PERTO</span>
              <h2>Detalhes que fazem a diferença</h2>
              <p>Toque em uma foto para ampliar e explorar a galeria.</p>
            </header>
            <div className={styles.portfolio}>
              {d.services.flatMap((s) =>
                s.images.map((image, index) => (
                  <CatalogMedia
                    key={`${s.id}-${image.id}`}
                    image={image}
                    alt={`${s.name}, foto ${index + 1}`}
                    onOpen={() => openPhoto(s.images, s.name, index)}
                  />
                )),
              )}
            </div>
            {!d.services.some((s) => s.images.length) && (
              <p className={styles.empty}>
                Adicione fotos aos serviços para compor seu portfólio.
              </p>
            )}
          </section>
        )}
        {section === "contact" && (
          <section
            className={styles.contact}
            aria-label="Contato e localização"
          >
            <span className={styles.eyebrow}>
              SEU PRÓXIMO MOMENTO DE CUIDADO
            </span>
            <h2>Gostou de algum serviço?</h2>
            <p>Entre em contato comigo e agende seu horário.</p>
            {bookingHref && schedule}
            <div className={styles.contacts}>
              {contacts.map((c) => (
                <a
                  key={c.id}
                  href={contactHref(c, d.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.label || c.kind}
                  <ArrowRight size={16} />
                </a>
              ))}
            </div>
            {d.address.visible && address && (
              <a
                className={styles.address}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={21} />
                <span>
                  {address}
                  <small>Ver no mapa</small>
                </span>
              </a>
            )}
            {qr && (
              <img
                className={styles.qr}
                src={qr}
                alt="QR Code para agendamento"
                width={140}
                height={140}
              />
            )}
          </section>
        )}
      </div>
      {section === "cover" && (
        <p className={styles.coverHint}>
          Seu catálogo, no seu ritmo. Escolha uma seção acima para explorar.
        </p>
      )}
      {modalOpen &&
        createPortal(
          <dialog
            ref={dialog}
            className={styles.dialog}
            style={colors}
            aria-label={
              viewer
                ? "Fotografias em tela cheia"
                : `Detalhes de ${detail?.name}`
            }
            onCancel={(e) => {
              e.preventDefault();
              setViewer(null);
              setDetail(null);
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setViewer(null);
                setDetail(null);
              }
            }}
          >
            {viewer ? (
              <PhotoViewer
                value={viewer}
                onChange={setViewer}
                onClose={() => setViewer(null)}
              />
            ) : (
              detail && (
                <div className={styles.detail}>
                  <button
                    className={styles.closeDetail}
                    aria-label="Fechar detalhes"
                    onClick={() => setDetail(null)}
                  >
                    <X />
                  </button>
                  {detail.images[0] && (
                    <CatalogMedia
                      image={detail.images[0]}
                      alt={detail.name}
                      onOpen={() => openPhoto(detail.images, detail.name)}
                    />
                  )}
                  <div className={styles.detailCopy}>
                    <span className={styles.eyebrow}>
                      CUIDADO EM CADA DETALHE
                    </span>
                    <h2>{detail.name}</h2>
                    <p>{detail.description}</p>
                    {price(detail)}
                    {detail.note && (
                      <div className={styles.observation}>
                        <strong>Antes de agendar</strong>
                        <p>{detail.note}</p>
                      </div>
                    )}
                    {detail.images.length > 1 && (
                      <button
                        className={styles.detailsButton}
                        onClick={() => openPhoto(detail.images, detail.name)}
                      >
                        Ver todas as {detail.images.length} fotos{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <div className={styles.serviceActions}>
                      {bookingHref && schedule}
                      {whatsapp && booking?.kind !== "whatsapp" && (
                        <a
                          className={styles.detailsButton}
                          href={contactHref(whatsapp, d.whatsappMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Conversar no WhatsApp
                        </a>
                      )}
                    </div>
                    <button
                      className={styles.detailsButton}
                      onClick={() => setDetail(null)}
                    >
                      <ArrowLeft size={16} />
                      Voltar aos serviços
                    </button>
                  </div>
                </div>
              )
            )}
          </dialog>,
          document.body,
        )}
    </div>
  );
}
