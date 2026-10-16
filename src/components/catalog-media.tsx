"use client";
import { useState, type CSSProperties } from "react";
import { Expand } from "lucide-react";
import type { CatalogImage } from "@/lib/catalog";
import { imageLayout } from "@/lib/image-layout";
import { useImageSource } from "./guest-context";
import styles from "./catalog-digital.module.css";

export function CatalogMedia({
  image,
  alt,
  role = "service",
  eager = false,
  onOpen,
}: {
  image: CatalogImage;
  alt: string;
  role?: "service" | "cover" | "portrait";
  eager?: boolean;
  onOpen?: () => void;
}) {
  const source = useImageSource();
  const [dimensions, setDimensions] = useState({
    width: image.width || 1,
    height: image.height || 1,
  });
  const [failed, setFailed] = useState(false);
  const layout = imageLayout(dimensions.width, dimensions.height);
  const framed = layout === "tall" || layout === "panorama";
  const src = source(image.id, 1440);
  const privateImage = src?.startsWith("/api/images/");
  const content = (
    <>
      {framed && (
        <img
          className={styles.backdrop}
          src={source(image.id, 320)}
          alt=""
          aria-hidden="true"
          loading={eager ? "eager" : "lazy"}
        />
      )}
      {failed ? (
        <span className={styles.imageError}>
          Não conseguimos carregar esta foto. Recarregue para tentar novamente.
        </span>
      ) : (
        <img
          className={`catalog-photo ${role === "portrait" ? "portrait" : ""} ${styles.photo}`}
          src={src}
          srcSet={
            privateImage
              ? [320, 640, 960, 1440, 2048]
                  .map((w) => `${source(image.id, w)} ${w}w`)
                  .join(", ")
              : undefined
          }
          sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1100px) 60vw, 720px"
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          width={image.width}
          height={image.height}
          onLoad={(e) => {
            const img = e.currentTarget;
            setDimensions({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }}
          onError={() => setFailed(true)}
        />
      )}
      {onOpen && !failed && (
        <span className={styles.expand}>
          <Expand size={15} /> Ampliar foto
        </span>
      )}
    </>
  );
  const props = {
    className: `${styles.media} ${styles[layout]} ${framed ? styles.framed : ""}`,
    style: {
      "--image-ratio": dimensions.width / dimensions.height,
    } as CSSProperties,
    "data-orientation": layout,
    "data-media-role": role,
  };
  return onOpen ? (
    <button
      type="button"
      {...props}
      aria-label={`Ampliar foto: ${alt}`}
      onClick={onOpen}
    >
      {content}
    </button>
  ) : (
    <div {...props}>{content}</div>
  );
}
