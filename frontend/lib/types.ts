export type RunStatus = "pending" | "running" | "complete" | "failed";
export type EngagementAction = "LIKE" | "FOLLOW" | "IGNORE";

export interface Persona {
  id: string;
  name: string;
  bio: string;
  voice: string;
  stance: string;
  camp: string;
}

export interface Post {
  id: string;
  agent_id: string;
  round: number;
  content: string;
  timestamp: string;
}

export interface Engagement {
  from_agent: string;
  to_post: string;
  to_agent: string;
  action: EngagementAction;
  round: number;
}

export interface RoundMetrics {
  n_communities: number;
  modularity: number;
  modularity_ci_low: number;
  modularity_ci_high: number;
  modularity_p: number;
  assortativity: number;
  content_engagement_correlation: number;
}

export interface RoundSnapshot {
  round: number;
  posts: Post[];
  engagements: Engagement[];
  metrics: RoundMetrics;
}

export interface Run {
  id: string;
  topic: string;
  n_agents: number;
  n_rounds: number;
  started_at: string;
  completed_at: string | null;
  status: RunStatus;
  personas: Persona[];
  rounds: RoundSnapshot[];
}

export interface FeedItem {
  post_id: string;
  agent_id: string;
  agent_name: string;
  agent_camp: string;
  round: number;
  content: string;
  timestamp: string;
  like_count: number;
  follow_count: number;
  ignore_count: number;
  engagement_count: number;
}

export interface GraphNode {
  id: string;
  name: string;
  camp: string;
  community: number;
  post_count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphResponse {
  run_id: string;
  round: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RoundMetricPoint {
  round: number;
  metrics: RoundMetrics;
}

export interface AgentEmbedding {
  agent_id: string;
  embedding: number[];
}

export interface AnalysisResponse {
  run_id: string;
  status: RunStatus;
  topic: string;
  per_round_metrics: RoundMetricPoint[];
  final_metrics: RoundMetrics | null;
  communities: Record<string, number>;
  embeddings: AgentEmbedding[];
  embeddings_available: boolean;
}

export interface DashboardData {
  run: Run;
  feed: FeedItem[];
  graph: GraphResponse;
  analysis: AnalysisResponse;
  round: number;
}
