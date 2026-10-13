"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import { Catalog, CatalogImage, draftSchema, readyErrors } from "@/lib/catalog";
import { CatalogPreview } from "./catalog-preview";
type Props = { id: string; initial: Catalog; revision: number };
const steps = ["Identidade", "Contato", "Serviços", "Seu estilo", "Conferir"];
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          maxLength={maxLength}
        />
      )}
    </label>
  );
}
function Upload({
  catalogId,
  label,
  value,
  onChange,
}: {
  catalogId: string;
  label: string;
  value: CatalogImage | null;
  onChange: (v: CatalogImage | null) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState("");
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  return (
    <div>
      <div className="upload-box">
        {value ? (
          <img src={`/api/images/${value.id}`} alt={label} />
        ) : (
          <ImagePlus size={25} style={{ color: "#a48173", marginBottom: 12 }} />
        )}
        <strong className="small">{label}</strong>
        <small className="muted">
          {value ? "Toque para substituir" : "JPG, PNG ou WebP · até 4 MB"}
        </small>
        <input
          aria-label={label}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={progress !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = "";
            if (file.size > 4194304) {
              setError("Escolha uma foto com até 4 MB.");
              return;
            }
            setError("");
            setProgress(0);
            const req = new XMLHttpRequest();
            req.open("POST", `/api/catalogs/${catalogId}/images`);
            req.upload.onprogress = (e) => {
              if (e.lengthComputable)
                setProgress(Math.round((e.loaded / e.total) * 100));
            };
            req.onload = () => {
              try {
                const d = JSON.parse(req.responseText);
                if (req.status >= 400)
                  setError(d.error || "Não conseguimos enviar a foto.");
                else latestChange.current(d);
              } catch {
                setError("Não conseguimos enviar a foto.");
              }
              setProgress(null);
            };
            req.onerror = () => {
              setProgress(null);
              setError("Confira sua conexão e tente novamente.");
            };
            const form = new FormData();
            form.append("file", file);
            req.send(form);
          }}
        />
      </div>
      {progress !== null && (
        <>
          <progress className="progress" value={progress} max={100} />
          <small role="status">
            {progress === 100
              ? "Preparando sua foto…"
              : `Enviando… ${progress}%`}
          </small>
        </>
      )}
      {value && (
        <button
          type="button"
          className="ghost small"
          onClick={() => onChange(null)}
        >
          <Trash2 size={14} />
          Remover foto
        </button>
      )}
      {error && (
        <p className="message error small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  if (to < 0 || to >= list.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function Editor({ id, initial, revision }: Props) {
  const [doc, setDoc] = useState(initial),
    [step, setStep] = useState(0),
    [status, setStatus] = useState("Salvo ✓"),
    [error, setError] = useState(""),
    [category, setCategory] = useState("");
  const currentDoc = useRef(initial);
  const revisionRef = useRef(revision),
    pending = useRef<Catalog | null>(null),
    running = useRef<Promise<boolean> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    drag = useRef<number | null>(null),
    dirty = useRef(false);
  const flush = useCallback(async (): Promise<boolean> => {
    if (running.current) return running.current;
    const work = async () => {
      while (pending.current) {
        const next = pending.current;
        pending.current = null;
        const parsed = draftSchema.safeParse(next);
        if (!parsed.success) {
          pending.current = next;
          setError(parsed.error.issues[0].message);
          setStatus("Revise os campos");
          return false;
        }
        setStatus("Salvando…");
        try {
          const res = await fetch(`/api/catalogs/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document: next,
              revision: revisionRef.current,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          revisionRef.current = data.revision;
          setError("");
        } catch (e) {
          if (!pending.current) pending.current = next;
          setError(e instanceof Error ? e.message : "Confira sua conexão.");
          setStatus("Não salvo");
          return false;
        }
      }
      dirty.current = false;
      setStatus("Salvo ✓");
      return true;
    };
    running.current = work();
    try {
      return await running.current;
    } finally {
      running.current = null;
    }
  }, [id]);
  function update(next: Catalog) {
    currentDoc.current = next;
    setDoc(next);
    pending.current = next;
    dirty.current = true;
    setStatus("Alterações por salvar");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 900);
  }
  function patch<K extends keyof Catalog>(key: K, value: Catalog[K]) {
    update({ ...currentDoc.current, [key]: value });
  }
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const online = () => {
      if (pending.current) void flush();
    };
    window.addEventListener("beforeunload", before);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("online", online);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);
  async function checkout() {
    if (!(await flush())) return;
    const errors = readyErrors(doc);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    location.href = `/catalogo/${id}/checkout`;
  }
  const service = (
    index: number,
    changes: Partial<Catalog["services"][number]>,
  ) =>
    patch(
      "services",
      currentDoc.current.services.map((s, i) =>
        i === index ? { ...s, ...changes } : s,
      ),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU CATÁLOGO, DO SEU JEITO</div>
          <h1 style={{ marginTop: 12 }}>Vamos criar algo lindo?</h1>
        </div>
        <span className="save-state" role="status">
          {status === "Salvando…" ? (
            <LoaderCircle size={15} className="spinning" />
          ) : (
            <Check size={15} />
          )}{" "}
          {status}
        </span>
      </div>
      <div className="editor-layout">
        <aside className="wizard-nav" aria-label="Etapas do catálogo">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
            >
              <span className="num">{i + 1}</span>
              {s}
            </button>
          ))}
        </aside>
        <div className="editor-main">
          {error && (
            <div className="message error" role="alert">
              {error}
              <button className="ghost" onClick={() => void flush()}>
                Tentar salvar novamente
              </button>
            </div>
          )}
          {step === 0 && (
            <div className="card">
              <div className="eyebrow">01 · IDENTIDADE</div>
              <h2 style={{ marginTop: 12 }}>Conte um pouco sobre você</h2>
              <p className="muted">
                Sua personalidade é o que torna seu trabalho único.
              </p>
              <div className="grid">
                <Field
                  label="Seu nome profissional"
                  value={doc.professional}
                  onChange={(v) => patch("professional", v)}
                  maxLength={100}
                />
                <Field
                  label="Nome do salão ou negócio"
                  value={doc.business}
                  onChange={(v) => patch("business", v)}
                  maxLength={100}
                />
              </div>
              <div className="photo-grid">
                {(["portrait", "logo", "cover"] as const).map((key, i) => (
                  <Upload
                    key={key}
                    catalogId={id}
                    label={
                      ["Sua foto ou do espaço", "Seu logotipo", "Foto de capa"][
                        i
                      ]
                    }
                    value={doc[key]}
                    onChange={(v) => patch(key, v)}
                  />
                ))}
              </div>
              <Field
                label="Sobre você ou seu negócio"
                value={doc.about}
                onChange={(v) => patch("about", v)}
                multiline
                maxLength={2500}
              />
              <p className="small muted">
                Conte sua especialidade e o que você mais ama no seu trabalho.
              </p>
              <Field
                label="Suas especialidades (opcional)"
                value={doc.specialties}
                onChange={(v) => patch("specialties", v)}
                maxLength={300}
              />
            </div>
          )}
          {step === 1 && (
            <div className="card">
              <div className="eyebrow">02 · CONTATO</div>
              <h2 style={{ marginTop: 12 }}>
                Como suas clientes te encontram?
              </h2>
              <p className="muted">Você escolhe o que aparece no catálogo.</p>
              {doc.contacts.map((c, index) => (
                <div
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    marginBottom: 20,
                  }}
                >
                  <div className="grid">
                    <label className="field">
                      Tipo de contato
                      <select
                        value={c.kind}
                        onChange={(e) =>
                          patch(
                            "contacts",
                            doc.contacts.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    kind: e.target.value as typeof c.kind,
                                    label: e.target.selectedOptions[0].text,
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        {Object.entries({
                          whatsapp: "WhatsApp",
                          phone: "Telefone",
                          instagram: "Instagram",
                          tiktok: "TikTok",
                          facebook: "Facebook",
                          website: "Site",
                          booking: "Agendamento",
                          other: "Outro link",
                        }).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label={
                        ["whatsapp", "phone"].includes(c.kind)
                          ? "Número com DDD"
                          : "Link completo (https://…)"
                      }
                      value={c.value}
                      onChange={(v) =>
                        patch(
                          "contacts",
                          doc.contacts.map((x, i) =>
                            i === index ? { ...x, value: v } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div
                    className="inline"
                    style={{ justifyContent: "space-between" }}
                  >
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={c.visible}
                        onChange={(e) =>
                          patch(
                            "contacts",
                            doc.contacts.map((x, i) =>
                              i === index
                                ? { ...x, visible: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      Mostrar no catálogo
                    </label>
                    <button
                      className="ghost"
                      onClick={() =>
                        patch(
                          "contacts",
                          doc.contacts.filter((x) => x.id !== c.id),
                        )
                      }
                      aria-label="Remover contato"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  patch("contacts", [
                    ...doc.contacts,
                    {
                      id: crypto.randomUUID(),
                      kind: doc.contacts.length ? "instagram" : "whatsapp",
                      label: doc.contacts.length ? "Instagram" : "WhatsApp",
                      value: "",
                      visible: true,
                    },
                  ])
                }
              >
                <Plus size={17} />
                Adicionar contato
              </button>
              <h3 style={{ marginTop: 32 }}>Seu endereço</h3>
              <div className="grid">
                {Object.entries({
                  street: "Endereço",
                  district: "Bairro",
                  city: "Cidade",
                  state: "Estado (UF)",
                  zip: "CEP (opcional)",
                }).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={doc.address[key as "street"]}
                    maxLength={key === "state" ? 2 : key === "zip" ? 9 : 150}
                    onChange={(v) =>
                      patch("address", {
                        ...doc.address,
                        [key]: key === "state" ? v.toUpperCase() : v,
                      })
                    }
                  />
                ))}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={doc.address.visible}
                  onChange={(e) =>
                    patch("address", {
                      ...doc.address,
                      visible: e.target.checked,
                    })
                  }
                />
                Exibir meu endereço
              </label>
              <Field
                label="Mensagem que você receberá pelo WhatsApp"
                value={doc.whatsappMessage}
                onChange={(v) => patch("whatsappMessage", v)}
                multiline
                maxLength={500}
              />
              <label className="field">
                QR Code no catálogo
                <select
                  value={doc.qr}
                  onChange={(e) => patch("qr", e.target.value as Catalog["qr"])}
                >
                  <option value="none">Não mostrar</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="booking">Link de agendamento</option>
                </select>
              </label>
            </div>
          )}
          {step === 2 && (
            <>
              <div className="eyebrow">03 · SERVIÇOS</div>
              <h2 style={{ marginTop: 12 }}>Agora adicione seus serviços</h2>
              <p className="muted">
                Adicione uma foto bonita do seu trabalho e mostre cada detalhe.
              </p>
              <details className="card" style={{ marginBottom: 25 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Organizar categorias
                </summary>
                <p className="small muted" style={{ marginTop: 15 }}>
                  Use as setas para mudar a ordem. Ao remover uma categoria, os
                  serviços ficam em “Outros serviços”.
                </p>
                {doc.categories.map((c, i) => (
                  <div key={c.id} className="category-row">
                    <span>{c.name}</span>
                    <button
                      className="ghost"
                      aria-label={`Subir categoria ${c.name}`}
                      disabled={!i}
                      onClick={() =>
                        patch("categories", move(doc.categories, i, i - 1))
                      }
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="ghost"
                      aria-label={`Descer categoria ${c.name}`}
                      disabled={i === doc.categories.length - 1}
                      onClick={() =>
                        patch("categories", move(doc.categories, i, i + 1))
                      }
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="ghost"
                      aria-label={`Remover categoria ${c.name}`}
                      onClick={() =>
                        update({
                          ...doc,
                          categories: doc.categories.filter(
                            (x) => x.id !== c.id,
                          ),
                          services: doc.services.map((s) =>
                            s.categoryId === c.id
                              ? { ...s, categoryId: null }
                              : s,
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <div className="inline" style={{ marginTop: 18 }}>
                  <input
                    aria-label="Nova categoria"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Nova categoria"
                    maxLength={80}
                  />
                  <button
                    className="secondary"
                    disabled={!category.trim()}
                    onClick={() => {
                      patch("categories", [
                        ...doc.categories,
                        { id: crypto.randomUUID(), name: category.trim() },
                      ]);
                      setCategory("");
                    }}
                  >
                    Adicionar categoria
                  </button>
                </div>
              </details>
              {doc.services.map((s, index) => (
                <article
                  key={s.id}
                  className="card service-card"
                  draggable
                  onDragStart={(e) => {
                    if (
                      (e.target as HTMLElement).closest(
                        "input,textarea,select,button",
                      )
                    ) {
                      e.preventDefault();
                      return;
                    }
                    drag.current = index;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag.current !== null) {
                      patch(
                        "services",
                        move(doc.services, drag.current, index),
                      );
                      drag.current = null;
                    }
                  }}
                >
                  <div className="service-title">
                    <h3>Serviço {index + 1}</h3>
                    <div className="inline">
                      <button
                        className="ghost"
                        disabled={!index}
                        aria-label="Subir serviço"
                        onClick={() =>
                          patch(
                            "services",
                            move(doc.services, index, index - 1),
                          )
                        }
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        className="ghost"
                        disabled={index === doc.services.length - 1}
                        aria-label="Descer serviço"
                        onClick={() =>
                          patch(
                            "services",
                            move(doc.services, index, index + 1),
                          )
                        }
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        className="ghost"
                        aria-label="Excluir serviço"
                        onClick={() => {
                          if (confirm(`Remover “${s.name}” do catálogo?`))
                            patch(
                              "services",
                              doc.services.filter((x) => x.id !== s.id),
                            );
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <Field
                    label="Nome do serviço"
                    value={s.name}
                    onChange={(v) => service(index, { name: v })}
                    maxLength={120}
                  />
                  <Field
                    label="Descreva esse cuidado"
                    value={s.description}
                    onChange={(v) => service(index, { description: v })}
                    multiline
                    maxLength={1500}
                  />
                  <div className="grid">
                    <label className="field">
                      Quanto você cobra? (R$)
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        value={s.price / 100}
                        onChange={(e) =>
                          service(index, {
                            price: Math.round(Number(e.target.value) * 100),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Preço promocional (opcional)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.promotion === null ? "" : s.promotion / 100}
                        onChange={(e) =>
                          service(index, {
                            promotion:
                              e.target.value === ""
                                ? null
                                : Math.round(Number(e.target.value) * 100),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Categoria
                      <select
                        value={s.categoryId || ""}
                        onChange={(e) =>
                          service(index, { categoryId: e.target.value || null })
                        }
                      >
                        <option value="">Outros serviços</option>
                        {doc.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Duração (opcional)"
                      value={s.duration}
                      onChange={(v) => service(index, { duration: v })}
                      maxLength={80}
                    />
                  </div>
                  <Field
                    label="Observação (opcional)"
                    value={s.note}
                    onChange={(v) => service(index, { note: v })}
                    maxLength={500}
                  />
                  <div className="photo-grid">
                    {s.images.map((img, i) => (
                      <div key={img.id}>
                        <Upload
                          catalogId={id}
                          label={i === 0 ? "Foto principal" : `Foto ${i + 1}`}
                          value={img}
                          onChange={(v) =>
                            service(index, {
                              images: v
                                ? s.images.map((x, j) => (j === i ? v : x))
                                : s.images.filter((_, j) => j !== i),
                            })
                          }
                        />
                        <div className="inline">
                          <button
                            className="ghost"
                            disabled={!i}
                            onClick={() =>
                              service(index, {
                                images: move(s.images, i, i - 1),
                              })
                            }
                            aria-label="Mover foto para antes"
                          >
                            <ArrowLeft size={15} />
                          </button>
                          <button
                            className="ghost"
                            disabled={i === s.images.length - 1}
                            onClick={() =>
                              service(index, {
                                images: move(s.images, i, i + 1),
                              })
                            }
                            aria-label="Mover foto para depois"
                          >
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {s.images.length < 12 && (
                      <Upload
                        catalogId={id}
                        label="Adicionar foto"
                        value={null}
                        onChange={(v) => {
                          if (v) service(index, { images: [...s.images, v] });
                        }}
                      />
                    )}
                  </div>
                </article>
              ))}
              <button
                className="secondary full"
                onClick={() =>
                  patch("services", [
                    ...doc.services,
                    {
                      id: crypto.randomUUID(),
                      name: "Novo serviço",
                      description: "",
                      price: 0,
                      promotion: null,
                      categoryId: doc.categories[0]?.id || null,
                      duration: "",
                      note: "",
                      images: [],
                    },
                  ])
                }
              >
                <Plus size={18} />
                Adicionar serviço
              </button>
            </>
          )}
          {step === 3 && (
            <div className="card">
              <div className="eyebrow">04 · SEU ESTILO</div>
              <h2 style={{ marginTop: 12 }}>
                Seu catálogo está ficando lindo!
              </h2>
              <p className="muted">
                Escolha a combinação que mais parece com você.
              </p>
              <div className="templates">
                {(["elegante", "minimalista", "rose", "luxo"] as const).map(
                  (t, i) => (
                    <button
                      className={`template ${t} ${doc.theme.template === t ? "selected" : ""}`}
                      key={t}
                      onClick={() =>
                        patch("theme", {
                          ...doc.theme,
                          template: t,
                          primary: ["#78534f", "#333333", "#924857", "#806637"][
                            i
                          ],
                          secondary: [
                            "#f5eee8",
                            "#f4f4f4",
                            "#faedef",
                            "#f5f0e3",
                          ][i],
                          heading: ["#2c2928", "#242424", "#543039", "#322b20"][
                            i
                          ],
                          font: i === 1 ? "sans" : "serif",
                        })
                      }
                    >
                      <span style={{ fontFamily: "Georgia", fontSize: 26 }}>
                        Aa
                      </span>
                      {["Elegante", "Minimalista", "Rosé", "Luxo"][i]}
                    </button>
                  ),
                )}
              </div>
              <div className="grid">
                {(["primary", "secondary", "heading"] as const).map(
                  (key, i) => (
                    <Field
                      key={key}
                      label={
                        ["Cor principal", "Cor secundária", "Cor dos títulos"][
                          i
                        ]
                      }
                      type="color"
                      value={doc.theme[key]}
                      onChange={(v) =>
                        patch("theme", { ...doc.theme, [key]: v })
                      }
                    />
                  ),
                )}
                <label className="field">
                  Fonte
                  <select
                    value={doc.theme.font}
                    onChange={(e) =>
                      patch("theme", {
                        ...doc.theme,
                        font: e.target.value as "serif" | "sans",
                      })
                    }
                  >
                    <option value="serif">Clássica</option>
                    <option value="sans">Moderna</option>
                  </select>
                </label>
                <label className="field">
                  Formato das imagens
                  <select
                    value={doc.theme.imageShape}
                    onChange={(e) =>
                      patch("theme", {
                        ...doc.theme,
                        imageShape: e.target.value as "rounded" | "square",
                      })
                    }
                  >
                    <option value="rounded">Cantos suaves</option>
                    <option value="square">Cantos retos</option>
                  </select>
                </label>
                <label className="field">
                  Estilo dos cartões
                  <select
                    value={doc.theme.card}
                    onChange={(e) =>
                      patch("theme", {
                        ...doc.theme,
                        card: e.target.value as "soft",
                      })
                    }
                  >
                    <option value="soft">Fundo suave</option>
                    <option value="outlined">Com borda</option>
                    <option value="clean">Sem fundo</option>
                  </select>
                </label>
              </div>
              <button className="secondary full" onClick={() => setStep(4)}>
                <Eye size={18} />
                Conferir como ficou
              </button>
            </div>
          )}
          {step === 4 && (
            <>
              <h2>Confira como ficou</h2>
              <p className="muted">
                Esta é sua prévia. O PDF final é liberado após a confirmação do
                pagamento.
              </p>
              <CatalogPreview document={doc} />
            </>
          )}
          <div className="wizard-footer">
            <button
              className="secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)}>
                Continuar <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={checkout}>
                Gerar meu catálogo <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
