import { formatInteger } from "../lib/format";
import type { FeedItem } from "../lib/types";

interface SimulationFeedProps {
  items: FeedItem[];
  title?: string;
}

export function SimulationFeed({ items, title = "Simulation feed" }: SimulationFeedProps): JSX.Element {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-line px-5 py-4">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <span className="rounded-full border-[0.5px] border-line px-2.5 py-1 text-xs text-slate">{formatInteger(items.length)} posts</span>
      </div>
      <div className="divide-y-[0.5px] divide-line">
        {items.length ? (
          items.map((item) => <FeedPost key={item.post_id} item={item} />)
        ) : (
          <div className="p-5 text-sm text-slate">No posts are available for this round yet.</div>
        )}
      </div>
    </section>
  );
}

function FeedPost({ item }: { item: FeedItem }): JSX.Element {
  return (
    <article className="grid gap-4 p-5 transition-colors hover:bg-[#fbfbf8] md:grid-cols-[9rem_1fr]">
      <div>
        <h3 className="text-sm font-medium leading-5 text-ink">{item.agent_name}</h3>
        <span className="mt-2 inline-flex rounded-full border-[0.5px] border-line px-2 py-1 text-xs leading-none text-slate">
          {item.agent_camp}
        </span>
      </div>
      <div className="border-l-[0.5px] border-line pl-4">
        <p className="text-base leading-7 text-ink">{item.content}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate">
          <EngagementCount label="likes" value={item.like_count} />
          <EngagementCount label="follows" value={item.follow_count} />
          <EngagementCount label="ignores" value={item.ignore_count} />
        </div>
      </div>
    </article>
  );
}

function EngagementCount({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <span className="rounded-full border-[0.5px] border-line bg-white px-2.5 py-1 tabular-nums">
      {formatInteger(value)} {label}
    </span>
  );
}
