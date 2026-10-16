import { createRoot } from "react-dom/client";
import { Editor } from "../../src/components/editor";
import { emptyCatalog } from "../../src/lib/catalog";
import "../../src/app/globals.css";
import { PreviewFixture } from "./preview-fixture";
createRoot(document.getElementById("root")!).render(
  <main className="shell page">
    <p>Ambiente isolado de teste de componentes. Nenhuma cobrança.</p>
    {new URLSearchParams(location.search).has("preview") ? (
      <PreviewFixture />
    ) : (
      <Editor
        id="00000000-0000-4000-8000-000000000001"
        initial={emptyCatalog()}
        revision={1}
      />
    )}
  </main>,
);
