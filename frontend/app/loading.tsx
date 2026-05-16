export default function Loading(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 md:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-mist" />
      <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="h-80 animate-pulse rounded border border-line bg-mist" />
        <div className="h-80 animate-pulse rounded border border-line bg-mist" />
      </section>
    </main>
  );
}
