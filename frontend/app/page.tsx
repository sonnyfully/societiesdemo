import Link from "next/link";
import { getDefaultRunId } from "../lib/api";
import { SAVED_RUN_OPTIONS, savedRunOrCanonical } from "../lib/runs";

export default function Page(): JSX.Element {
  const defaultRunId = savedRunOrCanonical(getDefaultRunId());
  const simulationHref = `/simulation?runId=${encodeURIComponent(defaultRunId)}`;
  const resultsHref = `/results/${encodeURIComponent(defaultRunId)}`;

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-ink">
      <section className="mx-auto grid min-h-[92vh] w-full max-w-6xl content-center gap-10 px-5 py-12 md:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b-[0.5px] border-line pb-5 text-sm">
          <Link href="/" className="font-medium focus-visible:outline-ink">
            Homophily Simulation
          </Link>
          <div className="flex flex-wrap gap-5 text-slate">
            <Link href={simulationHref} className="hover:text-ink focus-visible:outline-ink">
              Simulation
            </Link>
            <Link href={resultsHref} className="hover:text-ink focus-visible:outline-ink">
              Results
            </Link>
            <Link href="/note" className="hover:text-ink focus-visible:outline-ink">
              Research note
            </Link>
            <Link href="/walkthrough" className="hover:text-ink focus-visible:outline-ink">
              Walkthrough
            </Link>
          </div>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <p className="eyebrow">Claude Haiku 4.5 replication</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-medium leading-[0.98] tracking-normal md:text-7xl">
              Homophily under model substitution
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate md:text-xl">
              A scaled-down topic simulation tests whether LLM agents preferentially engage with
              semantically similar others when the model family changes from GPT-3.5 to Claude Haiku 4.5.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={simulationHref}
                className="button-primary"
              >
                Replay full run
              </Link>
              <Link
                href="/note"
                className="button-secondary"
              >
                Read research note
              </Link>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="grid grid-cols-3 border-b-[0.5px] border-line text-center">
              <ResultStat label="Agents" value="100" />
              <ResultStat label="Rounds" value="12" />
              <ResultStat label="p-value" value="< 0.001" />
            </div>
            <div className="p-5">
              <p className="eyebrow">Canonical result</p>
              <p className="mt-3 text-2xl font-medium leading-snug text-ink">
                Reproduces, with attenuated magnitude.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate">
                Final modularity sits above the degree-preserving bootstrap null, while assortativity and content-engagement correlation remain weakly positive.
              </p>
              <form action="/simulation" className="mt-6 border-t-[0.5px] border-line pt-5">
                <label htmlFor="runId" className="text-sm font-medium text-ink">
                  Open a saved run
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <select id="runId" name="runId" defaultValue={defaultRunId} className="field flex-1">
                    {SAVED_RUN_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button-secondary min-h-11">
                    View
                  </button>
                </div>
              </form>
            </div>
          </div>
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

function ResultStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border-r-[0.5px] border-line p-4 last:border-r-0">
      <p className="text-xs text-slate">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}

function Feature({ label, text }: { label: string; text: string }): JSX.Element {
  return (
    <div className="panel p-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink">{label}</h2>
      <p className="mt-3 text-sm leading-6 text-slate">{text}</p>
    </div>
  );
}
