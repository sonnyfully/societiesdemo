"use client";

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { formatInteger } from "../lib/format";
import type { GraphEdge, GraphNode } from "../lib/types";

const COMMUNITY_COLORS = ["#9f2d55", "#3f7a58", "#2e7f8f", "#a46a22", "#4f5f6a", "#7a4f8f"];
const WIDTH = 860;
const HEIGHT = 620;
const COMPACT_HEIGHT = 380;
const TOOLTIP_WIDTH = 190;
const TOOLTIP_HEIGHT = 44;
const TOOLTIP_GAP = 12;

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

interface HoverState {
  node: SimNode;
  x: number;
  y: number;
}

export function NetworkGraph({ nodes, edges, compact = false }: NetworkGraphProps): JSX.Element {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<HoverState | null>(null);
  const height = compact ? COMPACT_HEIGHT : HEIGHT;
  const nodeRadius = compact ? 8 : 12;
  const layout = useMemo(() => computeLayout(nodes, edges, height, nodeRadius), [nodes, edges, height, nodeRadius]);
  const communities = useMemo(() => summarizeCommunities(nodes), [nodes]);

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
      <div ref={graphRef} className="relative bg-[#fbfbf8] p-3">
        <svg
          className="block h-auto min-h-72 w-full"
          width={WIDTH}
          height={height}
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
              onFocus={(event) => setHoveredNode(focusedTooltip(node, event, WIDTH, height, graphRef.current))}
              onBlur={() => setHoveredNode(null)}
              onMouseEnter={(event) => setHoveredNode(pointerTooltip(node, event, graphRef.current))}
              onMouseMove={(event) => setHoveredNode(pointerTooltip(node, event, graphRef.current))}
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
                strokeWidth={hoveredNode?.node.id === node.id ? 2.25 : 0.8}
              />
            </g>
          ))}
        </svg>
        {hoveredNode ? (
          <div
            className="pointer-events-none absolute z-30 w-[190px] rounded border-[0.5px] border-line bg-white px-2.5 py-1.5 text-left"
            style={{ left: hoveredNode.x, top: hoveredNode.y }}
          >
            <p className="truncate text-xs text-ink">{hoveredNode.node.name}</p>
            <p className="truncate text-[11px] leading-4 text-slate">
              Community {hoveredNode.node.community} · {hoveredNode.node.camp}
            </p>
          </div>
        ) : null}
      </div>
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

function pointerTooltip(node: SimNode, event: MouseEvent<SVGGElement>, container: HTMLDivElement | null): HoverState {
  if (!container) {
    return { node, x: 0, y: 0 };
  }
  const rect = container.getBoundingClientRect();
  return {
    node,
    ...clampedTooltipPosition(event.clientX - rect.left + TOOLTIP_GAP, event.clientY - rect.top - TOOLTIP_HEIGHT / 2, rect.width, rect.height)
  };
}

function focusedTooltip(
  node: SimNode,
  event: FocusEvent<SVGGElement>,
  width: number,
  height: number,
  container: HTMLDivElement | null
): HoverState {
  if (!container) {
    return { node, x: 0, y: 0 };
  }
  const containerRect = container.getBoundingClientRect();
  const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
  const svgLeft = svgRect ? svgRect.left - containerRect.left : 0;
  const svgTop = svgRect ? svgRect.top - containerRect.top : 0;
  const svgWidth = svgRect?.width ?? containerRect.width;
  const svgHeight = svgRect?.height ?? containerRect.height;

  return {
    node,
    ...clampedTooltipPosition(
      svgLeft + (((node.x ?? 0) / width) * svgWidth) + TOOLTIP_GAP,
      svgTop + (((node.y ?? 0) / height) * svgHeight) - TOOLTIP_HEIGHT / 2,
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

function compactPadding(nodeRadius: number): number {
  return nodeRadius + 24;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
