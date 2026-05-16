"use client";

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useMemo, useState } from "react";
import { formatInteger } from "../lib/format";
import type { GraphEdge, GraphNode } from "../lib/types";

const COMMUNITY_COLORS = ["#9f2d55", "#3f7a58", "#2e7f8f", "#a46a22", "#4f5f6a", "#7a4f8f"];
const WIDTH = 860;
const HEIGHT = 620;
const COMPACT_HEIGHT = 380;

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  compact?: boolean;
}

interface SimNode extends GraphNode, SimulationNodeDatum {}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  weight: number;
}

export function NetworkGraph({ nodes, edges, compact = false }: NetworkGraphProps): JSX.Element {
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const height = compact ? COMPACT_HEIGHT : HEIGHT;
  const nodeRadius = compact ? 8 : 12;
  const layout = useMemo(() => computeLayout(nodes, edges, height, nodeRadius), [nodes, edges, height, nodeRadius]);
  const communities = useMemo(() => summarizeCommunities(nodes), [nodes]);
  const tooltip = hoveredNode ? tooltipPosition(hoveredNode, WIDTH, height) : null;

  if (!nodes.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded border-[0.5px] border-line bg-white text-sm text-slate">
        No graph data yet.
      </div>
    );
  }

  return (
    <figure className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-line px-4 py-3">
        <p className="text-sm font-medium text-ink">Engagement graph</p>
        <p className="text-xs tabular-nums text-slate">
          {formatInteger(nodes.length)} agents · {formatInteger(edges.length)} edges
        </p>
      </div>
      <svg
        className="h-full min-h-72 w-full p-3"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="Weighted engagement network. Nodes are agents, edges are likes or follows, and colour plus hover labels indicate detected communities."
      >
        <rect width={WIDTH} height={height} fill="#fbfbf8" />
        {layout.links.map((link, index) => {
          const source = endpointNode(link.source);
          const target = endpointNode(link.target);
          if (!source || !target) {
            return null;
          }
          return (
            <line
              key={`${source.id}-${target.id}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={linkColor(source.community, target.community)}
              strokeOpacity={source.community === target.community ? "0.42" : "0.22"}
              strokeWidth={Math.max(0.75, Math.min(compact ? 4 : 7, link.weight * 1.15))}
            />
          );
        })}
        {layout.nodes.map((node) => (
          <g
            key={node.id}
            onMouseEnter={() => setHoveredNode(node)}
            onMouseLeave={() => setHoveredNode(null)}
            tabIndex={0}
            role="listitem"
            aria-label={`${node.name}, ${node.camp}, community ${node.community}`}
            className="outline-none"
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius}
              fill={communityColor(node.community)}
              stroke="#141414"
              strokeWidth={hoveredNode?.id === node.id ? 2.25 : 0.8}
            />
          </g>
        ))}
        {hoveredNode && tooltip ? (
          <g className="pointer-events-none" aria-hidden="true">
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width="190"
              height="44"
              rx="4"
              fill="#ffffff"
              stroke="#d8d8d2"
              strokeWidth="0.5"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 18} fontSize="12" fill="#141414">
              {hoveredNode.name}
            </text>
            <text x={tooltip.x + 10} y={tooltip.y + 34} fontSize="11" fill="#4f5f6a">
              Community {hoveredNode.community} · {hoveredNode.camp.slice(0, 24)}
            </text>
          </g>
        ) : null}
      </svg>
      {!compact ? (
        <figcaption className="flex flex-wrap gap-2 border-t-[0.5px] border-line px-4 py-3 text-xs text-slate">
          {communities.map((community) => (
            <span key={community.id} className="inline-flex items-center gap-2 rounded-full border-[0.5px] border-line bg-white px-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: communityColor(community.id) }} />
              Community {community.id}: {formatInteger(community.count)}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

function computeLayout(nodes: GraphNode[], edges: GraphEdge[], height: number, nodeRadius: number): { nodes: SimNode[]; links: SimLink[] } {
  const padding = compactPadding(nodeRadius);
  const radius = Math.min(WIDTH - padding * 2, height - padding * 2) * 0.34;
  const simNodes: SimNode[] = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius
    };
  });
  const simLinks: SimLink[] = edges.map((edge) => ({ ...edge }));

  forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((node) => node.id)
        .distance((link) => Math.max(62, 132 - link.weight * 12))
    )
    .force("charge", forceManyBody<SimNode>().strength(-210))
    .force("collide", forceCollide<SimNode>().radius(nodeRadius + 8))
    .force("center", forceCenter(WIDTH / 2, height / 2))
    .stop()
    .tick(240);

  simNodes.forEach((node) => {
    node.x = clamp(node.x ?? WIDTH / 2, padding, WIDTH - padding);
    node.y = clamp(node.y ?? height / 2, padding, height - padding);
  });

  return { nodes: simNodes, links: simLinks };
}

function endpointNode(endpoint: string | number | SimNode | undefined): SimNode | null {
  if (typeof endpoint === "object" && endpoint !== null) {
    return endpoint;
  }
  return null;
}

function communityColor(community: number): string {
  if (community < 0) {
    return "#9a9a90";
  }
  return COMMUNITY_COLORS[community % COMMUNITY_COLORS.length];
}

function linkColor(sourceCommunity: number, targetCommunity: number): string {
  if (sourceCommunity === targetCommunity && sourceCommunity >= 0) {
    return communityColor(sourceCommunity);
  }
  return "#8a8a82";
}

function summarizeCommunities(nodes: GraphNode[]): Array<{ id: number; count: number }> {
  const counts = new Map<number, number>();
  nodes.forEach((node) => counts.set(node.community, (counts.get(node.community) ?? 0) + 1));
  return Array.from(counts, ([id, count]) => ({ id, count })).sort((a, b) => a.id - b.id);
}

function tooltipPosition(node: SimNode, width: number, height: number): { x: number; y: number } {
  const x = clamp((node.x ?? 0) + 14, 8, width - 198);
  const y = clamp((node.y ?? 0) - 28, 8, height - 52);
  return { x, y };
}

function compactPadding(nodeRadius: number): number {
  return nodeRadius + 24;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
