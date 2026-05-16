"use client";

import { UMAP } from "umap-js";
import { useEffect, useState } from "react";
import type { AgentEmbedding, Persona } from "../lib/types";

const COMMUNITY_COLORS = ["#9f2d55", "#3f7a58", "#2e7f8f", "#a46a22", "#4f5f6a", "#7a4f8f"];
const WIDTH = 720;
const HEIGHT = 460;

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

export function EmbeddingMap({
  embeddings,
  personas,
  communities,
  available
}: EmbeddingMapProps): JSX.Element {
  const [hovered, setHovered] = useState<ProjectedPoint | null>(null);
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
      <section className="flex min-h-72 items-center justify-center rounded border-[0.5px] border-line bg-white p-6 text-center text-sm leading-6 text-slate">
        Embeddings are not available yet. Preload all-MiniLM-L6-v2, then request analysis for a saved run.
      </section>
    );
  }

  if (points.length === 0) {
    return (
      <section className="flex min-h-72 items-center justify-center rounded border-[0.5px] border-line bg-white p-6 text-center text-sm leading-6 text-slate">
        Projecting embeddings.
      </section>
    );
  }

  return (
    <figure className="rounded border-[0.5px] border-line bg-white p-4">
      <svg
        className="h-full min-h-72 w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="UMAP projection of agent post embeddings. Points are coloured by detected community and labelled on hover."
      >
        <rect width={WIDTH} height={HEIGHT} fill="#ffffff" />
        {points.map((point) => (
          <g
            key={point.agentId}
            onMouseEnter={() => setHovered(point)}
            onMouseLeave={() => setHovered(null)}
            tabIndex={0}
            role="listitem"
            aria-label={`${point.label}, ${point.camp}, community ${point.community}`}
            className="outline-none"
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={hovered?.agentId === point.agentId ? 8 : 6}
              fill={communityColor(point.community)}
              stroke="#141414"
              strokeWidth="0.75"
            />
            {hovered?.agentId === point.agentId ? (
              <g>
                <rect
                  x={point.x + 12}
                  y={point.y - 28}
                  width="190"
                  height="44"
                  rx="4"
                  fill="#ffffff"
                  stroke="#d8d8d2"
                  strokeWidth="0.5"
                />
                <text x={point.x + 22} y={point.y - 10} fontSize="12" fill="#141414">
                  {point.label}
                </text>
                <text x={point.x + 22} y={point.y + 6} fontSize="11" fill="#4f5f6a">
                  Community {point.community} · {point.camp.slice(0, 24)}
                </text>
              </g>
            ) : null}
          </g>
        ))}
      </svg>
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
