import Link from "next/link";
import { getDefaultRunId } from "../../lib/api";

export default function NotePage(): JSX.Element {
  const runId = getDefaultRunId() ?? "full-100x12";
  const simulationHref = `/simulation?runId=${encodeURIComponent(runId)}`;
  const resultsHref = `/results/${encodeURIComponent(runId)}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8 md:px-8">
      <header className="border-b-[0.5px] border-line pb-7">
        <Link href="/" className="text-sm text-slate hover:text-ink focus-visible:outline-ink">
          Homophily Simulation
        </Link>
        <p className="eyebrow mt-8">Research note</p>
        <h1 className="mt-3 text-4xl font-medium leading-tight tracking-normal text-ink md:text-6xl">
          Homophily under model substitution
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate">
          A scaled-down Claude Haiku 4.5 replication of He et al. (2026), written for quick technical review.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={simulationHref}
            className="button-primary"
          >
            Replay run
          </Link>
          <Link
            href={resultsHref}
            className="button-secondary"
          >
            View analysis
          </Link>
          <a
            href="/note.pdf"
            className="button-secondary"
          >
            Open PDF
          </a>
        </div>
      </header>

      <MemoSection title="Research Question">
        <p>
          He et al. (2026) report that GPT-3.5-powered agents on Chirper.ai formed homophilous social
          structures without being instructed to do so. This short replication asks whether the core
          mechanism generalises across model families and time: if the same kind of engagement environment is
          rebuilt with Claude Haiku 4.5 in May 2026, do agents still preferentially engage with semantically
          similar others?
        </p>
      </MemoSection>

      <MemoSection title="Design">
        <p>
          I ran a topic simulation rather than a faithful clone of Chirper. The completed run,{" "}
          <Code>full-100x12</Code>, used 100 Claude Haiku 4.5 agents over 12 rounds on the topic:{" "}
          <span className="text-ink">Should universities ban AI in coursework?</span>
        </p>
        <p>
          Agents were balanced across five latent perspectives. Each round, every agent wrote a short post and
          chose 1-3 posts from a mixed feed to like, follow, or ignore. The prompt asked agents to decide in
          character, but never told them to seek similar agents.
        </p>
        <p>
          Post histories were embedded with <Code>sentence-transformers/all-MiniLM-L6-v2</Code>. Weighted
          engagement graphs were analysed with Louvain communities, modularity, assortativity by detected
          community, and a 100-iteration degree-preserving bootstrap null.
        </p>
      </MemoSection>

      <section className="panel p-5">
        <h2 className="text-xl font-medium text-ink">Results</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead className="border-b-[0.5px] border-line text-slate">
              <tr>
                <th className="py-3 pr-4 font-medium">Metric</th>
                <th className="py-3 pr-4 font-medium">He et al. English subset</th>
                <th className="py-3 pr-4 font-medium">Claude Haiku simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-line">
              <MemoRow metric="Agents / duration" reference="17,746 / 28 days" value="100 / 12 rounds" />
              <MemoRow metric="Final communities" reference="-" value="7" />
              <MemoRow metric="Final modularity" reference="0.38" value="0.131" />
              <MemoRow metric="Bootstrap 95% null interval" reference="-" value="[0.101, 0.117]" />
              <MemoRow metric="Bootstrap p-value" reference="< .001" value="0.000" />
              <MemoRow metric="Final assortativity" reference="0.61" value="0.069" />
              <MemoRow metric="Content-engagement correlation" reference="significant in paper" value="0.018" />
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate">
          Classification: <span className="font-medium text-ink">reproduces, with attenuated magnitude</span>.
          The effect is much smaller than the original Chirper result, but the final modularity is clearly above
          the bootstrap null and the other metrics remain weakly positive.
        </p>
      </section>

      <MemoSection title="Interpretation">
        <p>
          The result matters because it tests the part of the finding that is important for synthetic-audience
          systems: interaction can change a simulated population. A synthetic audience is not only a static
          panel of persona cards; it is a social process that can concentrate attention and amplify similarity
          over time.
        </p>
        <p>
          For a system such as Radiant, the product implication is a diagnostic one. A simulated buyer
          committee, shareholder base, or policy audience may begin diverse but become less diverse through
          repeated rounds of interaction. Surfacing modularity, assortativity, and content-similarity
          engagement over time would make that drift visible.
        </p>
      </MemoSection>

      <MemoSection title="Limitations">
        <p>
          This is a scaled-down replication, not a full reproduction. It uses one seed topic, 100 agents, and 12
          rounds, while He et al. analysed tens of thousands of agents over 28 days on a richer social
          platform. The feed is a compact topic simulation approximation rather than a live Twitter-like system.
          Community detection also differs: I used Louvain because it is a modern weighted-graph default,
          while the paper reports label propagation and fast-greedy variants.
        </p>
      </MemoSection>
    </main>
  );
}

function MemoSection({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <section className="grid gap-3 border-b-[0.5px] border-line pb-7 text-sm leading-6 text-slate">
      <h2 className="text-xl font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }): JSX.Element {
  return <code className="rounded-md border-[0.5px] border-line bg-white px-1.5 py-0.5 text-[0.85em] text-ink">{children}</code>;
}

function MemoRow({ metric, reference, value }: { metric: string; reference: string; value: string }): JSX.Element {
  return (
    <tr>
      <th className="py-3 pr-4 font-medium text-ink">{metric}</th>
      <td className="py-3 pr-4 text-slate">{reference}</td>
      <td className="py-3 pr-4 text-ink">{value}</td>
    </tr>
  );
}
