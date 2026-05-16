"use client";

import { UMAP } from "umap-js";
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { formatInteger } from "../lib/format";
import type { AgentEmbedding, Persona } from "../lib/types";

const COMMUNITY_COLORS = ["#9f2d55", "#3f7a58", "#2e7f8f", "#a46a22", "#4f5f6a", "#7a4f8f"];
const WIDTH = 720;
const HEIGHT = 460;
const TOOLTIP_WIDTH = 190;
const TOOLTIP_HEIGHT = 44;
const TOOLTIP_GAP = 12;

interface EmbeddingMapProps {
  embeddings: AgentEmbedding[];
  personas: Persona[];
  communities: Record<string, number>;
  available: boolean;
}

interface ProjectedPoint {
  agentId: string;
  x: number;
  y: number;
  community: number;
  label: string;
  camp: string;
}

interface HoverState {
  point: ProjectedPoint;
  x: number;
  y: number;
}

export function EmbeddingMap({
  embeddings,
  personas,
  communities,
  available
}: EmbeddingMapProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [points, setPoints] = useState<ProjectedPoint[]>([]);

  useEffect(() => {
    if (!available || embeddings.length === 0) {
      setPoints([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setPoints(projectEmbeddings(embeddings, personas, communities));
    }, 0);

    return () => window.clearTimeout(handle);
  }, [available, embeddings, personas, communities]);

  if (!available) {
    return (
      <section className="panel flex min-h-72 items-center justify-center p-6 text-center text-sm leading-6 text-slate">
        Embeddings are not available yet. Preload all-MiniLM-L6-v2, then request analysis for a saved run.
      </section>
    );
  }

  if (points.length === 0) {
    return (
      <section className="panel flex min-h-72 items-center justify-center p-6 text-center text-sm leading-6 text-slate">
        Projecting embeddings.
      </section>
    );
  }

  const communitySummary = summarizeCommunities(points);

  return (
    <figure className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-line px-4 py-3">
        <p className="text-sm font-medium text-ink">Semantic projection</p>
        <p className="text-xs tabular-nums text-slate">{formatInteger(points.length)} embedded agents</p>
      </div>
      <div ref={mapRef} className="relative bg-[#fbfbf8] p-3">
        <svg
          className="block h-auto min-h-72 w-full"
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="UMAP projection of agent post embeddings. Points are coloured by detected community and labelled on hover."
        >
          <rect width={WIDTH} height={HEIGHT} fill="#fbfbf8" />
          {points.map((point) => (
            <g
              key={point.agentId}
              onFocus={(event) => setHovered(focusedTooltip(point, event, mapRef.current))}
              onBlur={() => setHovered(null)}
              onMouseEnter={(event) => setHovered(pointerTooltip(point, event, mapRef.current))}
              onMouseMove={(event) => setHovered(pointerTooltip(point, event, mapRef.current))}
              onMouseLeave={() => setHovered(null)}
              tabIndex={0}
              role="listitem"
              aria-label={`${point.label}, ${point.camp}, community ${point.community}`}
              className="outline-none"
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={hovered?.point.agentId === point.agentId ? 8 : 6}
                fill={communityColor(point.community)}
                stroke="#141414"
                strokeWidth="0.75"
              />
            </g>
          ))}
        </svg>
        {hovered ? (
          <div
            className="pointer-events-none absolute z-30 w-[190px] rounded border-[0.5px] border-line bg-white px-2.5 py-1.5 text-left"
            style={{ left: hovered.x, top: hovered.y }}
          >
            <p className="truncate text-xs text-ink">{hovered.point.label}</p>
            <p className="truncate text-[11px] leading-4 text-slate">
              Community {hovered.point.community} · {hovered.point.camp}
            </p>
          </div>
        ) : null}
      </div>
      <figcaption className="flex flex-wrap gap-2 border-t-[0.5px] border-line px-4 py-3 text-xs text-slate">
        {communitySummary.map((community) => (
          <span key={community.id} className="inline-flex items-center gap-2 rounded-full border-[0.5px] border-line bg-white px-2 py-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: communityColor(community.id) }} />
            Community {community.id}: {formatInteger(community.count)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function projectEmbeddings(
  embeddings: AgentEmbedding[],
  personas: Persona[],
  communities: Record<string, number>
): ProjectedPoint[] {
  const personaById = new Map(personas.map((persona) => [persona.id, persona]));
  if (embeddings.length === 1) {
    const persona = personaById.get(embeddings[0].agent_id);
    return [
      {
        agentId: embeddings[0].agent_id,
        x: WIDTH / 2,
        y: HEIGHT / 2,
        community: communities[embeddings[0].agent_id] ?? -1,
        label: persona?.name ?? embeddings[0].agent_id,
        camp: persona?.camp ?? "unknown camp"
      }
    ];
  }

  const projection =
    embeddings.length < 3
      ? embeddings.map((_, index) => [index, 0])
      : new UMAP({
          nComponents: 2,
          nNeighbors: Math.max(2, Math.min(10, embeddings.length - 1)),
          minDist: 0.1,
          nEpochs: 80,
          random: seededRandom(42)
        }).fit(embeddings.map((embedding) => embedding.embedding));

  const xs = projection.map((point) => point[0]);
  const ys = projection.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const margin = 34;

  return embeddings.map((embedding, index) => {
    const persona = personaById.get(embedding.agent_id);
    return {
      agentId: embedding.agent_id,
      x: scale(projection[index][0], minX, maxX, margin, WIDTH - margin),
      y: scale(projection[index][1], minY, maxY, HEIGHT - margin, margin),
      community: communities[embedding.agent_id] ?? -1,
      label: persona?.name ?? embedding.agent_id,
      camp: persona?.camp ?? "unknown camp"
    };
  });
}

function scale(value: number, min: number, max: number, outMin: number, outMax: number): number {
  if (max === min) {
    return (outMin + outMax) / 2;
  }
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function communityColor(community: number): string {
  if (community < 0) {
    return "#9a9a90";
  }
  return COMMUNITY_COLORS[community % COMMUNITY_COLORS.length];
}

function summarizeCommunities(points: ProjectedPoint[]): Array<{ id: number; count: number }> {
  const counts = new Map<number, number>();
  points.forEach((point) => counts.set(point.community, (counts.get(point.community) ?? 0) + 1));
  return Array.from(counts, ([id, count]) => ({ id, count })).sort((a, b) => a.id - b.id);
}

function pointerTooltip(point: ProjectedPoint, event: MouseEvent<SVGGElement>, container: HTMLDivElement | null): HoverState {
  if (!container) {
    return { point, x: 0, y: 0 };
  }
  const rect = container.getBoundingClientRect();
  return {
    point,
    ...clampedTooltipPosition(event.clientX - rect.left + TOOLTIP_GAP, event.clientY - rect.top - TOOLTIP_HEIGHT / 2, rect.width, rect.height)
  };
}

function focusedTooltip(point: ProjectedPoint, event: FocusEvent<SVGGElement>, container: HTMLDivElement | null): HoverState {
  if (!container) {
    return { point, x: 0, y: 0 };
  }
  const containerRect = container.getBoundingClientRect();
  const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
  const svgLeft = svgRect ? svgRect.left - containerRect.left : 0;
  const svgTop = svgRect ? svgRect.top - containerRect.top : 0;
  const svgWidth = svgRect?.width ?? containerRect.width;
  const svgHeight = svgRect?.height ?? containerRect.height;

  return {
    point,
    ...clampedTooltipPosition(
      svgLeft + ((point.x / WIDTH) * svgWidth) + TOOLTIP_GAP,
      svgTop + ((point.y / HEIGHT) * svgHeight) - TOOLTIP_HEIGHT / 2,
      containerRect.width,
      containerRect.height
    )
  };
}

function clampedTooltipPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: clamp(x, 8, Math.max(8, width - TOOLTIP_WIDTH - 8)),
    y: clamp(y, 8, Math.max(8, height - TOOLTIP_HEIGHT - 8))
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
