export default function Loading(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
      <div className="h-28 animate-pulse rounded border-[0.5px] border-line bg-mist" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 w-24 animate-pulse rounded bg-mist" />
        ))}
      </div>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[36rem] animate-pulse rounded border-[0.5px] border-line bg-mist" />
        <div className="h-[36rem] animate-pulse rounded border-[0.5px] border-line bg-mist" />
      </section>
    </main>
  );
}
