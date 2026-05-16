export default function Loading(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
      <div className="h-36 animate-pulse rounded border-[0.5px] border-line bg-mist" />
      <div className="h-52 animate-pulse rounded border-[0.5px] border-line bg-mist" />
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded border-[0.5px] border-line bg-mist" />
        <div className="h-96 animate-pulse rounded border-[0.5px] border-line bg-mist" />
      </section>
    </main>
  );
}
