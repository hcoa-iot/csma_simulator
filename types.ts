
export enum NodeType {
  IDLE = 'IDLE',
  SENSING = 'SENSING',
  BACKOFF = 'BACKOFF',
  BACKOFF_PAUSED = 'BP',
  TX_PREAMBLE = 'P',
  TX_FC = 'FC',
  TX_DATA = 'D',
  WAIT_RIFS = 'R', // RIFS/SIFS
  RX_ACK = 'A', // Receiving ACK (success state)
  COLLISION = 'COL', // Visually distinct collision state
  FAILED = 'F', // Failed after max retries
}

export interface SimConfig {
  // Global
  slotDurationUs: number; // Just for display math, simulation steps are logical slots
  dataSlots: number;
  ackSlots: number; // Fixed usually (P+FC)
  collisionPenalty: number; // Default VCS duration when Preamble heard
  
  // Protocol
  pe: number; // Priority/Preamble slots
  minBe: number;
  maxBe: number;
  maxNb: number; // Max retries
  
  // Scenario
  nodeCount: number;
  packetGenMode: 'RANDOM' | 'INTERVAL';
  packetProb: number; // Probability to generate packet per tick if queue empty
  packetInterval: number; // Fixed interval in slots
  simDuration: number; // Total slots to simulate
}

export interface NodeConfig {
  id: number;
  startTick: number; // Offset
}

export interface LogEntry {
  tick: number;
  nodeId: number | string;
  type: 'INFO' | 'COLLISION' | 'SUCCESS' | 'DROP' | 'VCS';
  message: string;
}

export interface SimStats {
  totalPacketsGenerated: number;
  successCount: number;
  success1st: number;
  success2nd: number;
  success3rd: number;
  failureCount: number;
  collisionCount: number; // Physical overlaps
  totalLatency: number; // For average calc
  maxQueueDepth: number; // Max buffered packets seen
  
  // Channel Utilization Metrics (Ticks)
  channelIdleTicks: number;
  channelTxTicks: number;
  channelCollisionTicks: number;
  channelBackoffTicks: number;
}

export type TimelineCell = {
  state: NodeType;
  info?: string | number; // For Backoff counter or other info
  isCollision?: boolean;
};

export type TimelineData = {
  [nodeId: number]: TimelineCell[];
};

export interface SimulationResult {
  timeline: TimelineData;
  logs: LogEntry[];
  stats: SimStats;
  duration: number;
}
