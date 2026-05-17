import type { Metadata } from "next";
import Link from "next/link";
import { getDefaultRunId } from "../../lib/api";

export const metadata: Metadata = {
  title: "Walkthrough — Homophily replication",
  description:
    "A 2-minute walkthrough of a scaled-down replication of He et al. (2026) on Claude Haiku 4.5",
  openGraph: {
    title: "Walkthrough — Homophily replication",
    description:
      "A 2-minute walkthrough of a scaled-down replication of He et al. (2026) on Claude Haiku 4.5",
    type: "video.other"
  }
};

export default function WalkthroughPage(): JSX.Element {
  const runId = getDefaultRunId();
  const dashboardHref = `/simulation?runId=${encodeURIComponent(runId)}`;

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-12 md:px-8">
        <header className="mb-7 border-b-[0.5px] border-line pb-7">
          <Link href="/" className="text-sm text-slate hover:text-ink focus-visible:outline-ink">
            Homophily Simulation
          </Link>
          <p className="eyebrow mt-10">Walkthrough · 2 min</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-medium leading-tight tracking-normal text-ink md:text-6xl">
            Homophily replication — Claude Haiku 4.5
          </h1>
        </header>

        <video
          className="aspect-video w-full max-w-[960px] self-center rounded-xl border-[0.5px] border-line bg-white"
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
        >
          <source src="/walkthrough.mp4" type="video/mp4" />
        </video>

        <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate">
          <Link href={dashboardHref} className="hover:text-ink focus-visible:outline-ink">
            Dashboard
          </Link>
          <a href="/note.pdf" className="hover:text-ink focus-visible:outline-ink">
            Research note (PDF)
          </a>
          <a
            href="https://github.com/sonnyfully/societiesdemo"
            className="hover:text-ink focus-visible:outline-ink"
          >
            GitHub repo
          </a>
        </nav>
      </section>
    </main>
  );
}
