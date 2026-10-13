"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell page">
      <div className="card empty">
        <h2>Não conseguimos abrir esta página.</h2>
        <p>Suas informações salvas continuam seguras. Tente novamente.</p>
        <button onClick={reset}>Tentar novamente</button>
      </div>
    </main>
  );
}
