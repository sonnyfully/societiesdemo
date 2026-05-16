import { formatInteger } from "../lib/format";
import type { FeedItem } from "../lib/types";

interface SimulationFeedProps {
  items: FeedItem[];
  title?: string;
}

export function SimulationFeed({ items, title = "Simulation feed" }: SimulationFeedProps): JSX.Element {
  return (
    <section className="rounded border-[0.5px] border-line bg-white">
      <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-line px-5 py-4">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <span className="text-sm text-slate">{formatInteger(items.length)} posts</span>
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
    <article className="p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-sm font-medium text-ink">{item.agent_name}</h3>
        <span className="rounded border-[0.5px] border-line px-2 py-1 text-xs text-slate">
          {item.agent_camp}
        </span>
      </div>
      <p className="mt-3 text-base leading-7 text-ink">{item.content}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate">
        <span>{formatInteger(item.like_count)} likes</span>
        <span>{formatInteger(item.follow_count)} follows</span>
        <span>{formatInteger(item.ignore_count)} ignores</span>
      </div>
    </article>
  );
}
