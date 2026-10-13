export default function Loading() {
  return (
    <main className="shell page" aria-busy="true" aria-label="Carregando">
      <div className="skeleton" />
      <div className="skeleton" style={{ marginTop: 25 }} />
    </main>
  );
}
