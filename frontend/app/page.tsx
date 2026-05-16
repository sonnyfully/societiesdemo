import Link from "next/link";
import { getDefaultRunId } from "../lib/api";

export default function Page(): JSX.Element {
  const defaultRunId = getDefaultRunId();
  const simulationHref = defaultRunId ? `/simulation?runId=${encodeURIComponent(defaultRunId)}` : "/simulation";
  const resultsHref = defaultRunId ? `/results/${encodeURIComponent(defaultRunId)}` : null;

  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="mx-auto grid min-h-[92vh] w-full max-w-6xl content-center gap-10 px-5 py-12 md:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/" className="font-medium focus-visible:outline-ink">
            Homophily Simulation
          </Link>
          <div className="flex flex-wrap gap-4 text-slate">
            <Link href={simulationHref} className="hover:text-ink focus-visible:outline-ink">
              Simulation
            </Link>
            {resultsHref ? (
              <Link href={resultsHref} className="hover:text-ink focus-visible:outline-ink">
                Results
              </Link>
            ) : null}
            <Link href="/note" className="hover:text-ink focus-visible:outline-ink">
              Research note
            </Link>
          </div>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-normal text-slate">Claude Haiku 4.5 replication</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-medium leading-tight tracking-normal md:text-7xl">
              Homophily under model substitution
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate">
              A scaled-down topic simulation tests whether LLM agents preferentially engage with
              semantically similar others when the model family changes from GPT-3.5 to Claude Haiku 4.5.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={simulationHref}
                className="inline-flex min-h-11 items-center rounded border-[0.5px] border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:outline-ink"
              >
                Replay full run
              </Link>
              <Link
                href="/note"
                className="inline-flex min-h-11 items-center rounded border-[0.5px] border-line px-4 text-sm font-medium text-ink hover:border-ink focus-visible:outline-ink"
              >
                Read research note
              </Link>
            </div>
          </div>

          <form action="/simulation" className="rounded border-[0.5px] border-line bg-white p-5">
            <label htmlFor="runId" className="text-sm font-medium text-ink">
              Open a saved run
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="runId"
                name="runId"
                defaultValue={defaultRunId ?? ""}
                placeholder="backend run id"
                className="min-h-11 flex-1 rounded border-[0.5px] border-line px-3 text-sm text-ink placeholder:text-slate"
              />
              <button
                type="submit"
                className="min-h-11 rounded border-[0.5px] border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:outline-ink"
              >
                View simulation
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate">
              Runs are loaded from the FastAPI backend using saved experiment data.
            </p>
          </form>
        </div>

        <div className="grid gap-4 border-t-[0.5px] border-line pt-8 md:grid-cols-3">
          <Feature label="Mechanism" text="Agents post, read a mixed feed, and choose 1-3 posts to like, follow, or ignore." />
          <Feature label="Measurement" text="Weighted engagement graphs, Louvain communities, MiniLM embeddings, and a degree-preserving null." />
          <Feature label="Constraint" text="No prompt tells agents to seek similar others. The homophily signal has to emerge." />
        </div>
      </section>
    </main>
  );
}

function Feature({ label, text }: { label: string; text: string }): JSX.Element {
  return (
    <div className="rounded border-[0.5px] border-line bg-white p-5">
      <h2 className="text-sm font-medium text-ink">{label}</h2>
      <p className="mt-3 text-sm leading-6 text-slate">{text}</p>
    </div>
  );
}
