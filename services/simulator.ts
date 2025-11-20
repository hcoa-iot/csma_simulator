
import { SimConfig, SimulationResult, LogEntry, SimStats, NodeType, TimelineCell, TimelineData } from '../types';

class Node {
  id: number;
  config: SimConfig;
  
  // State
  state: NodeType = NodeType.IDLE;
  packetQueue: number[] = []; // Stores birth tick of each packet
  
  // Protocol Counters
  vcs: number = 0; // Virtual Carrier Sense (NAV)
  nb: number = 0; // Number of Backoffs (Retries)
  be: number = 0; // Backoff Exponent
  backoffCounter: number = 0;
  
  // Transmission State
  txProgress: number = 0;
  isCurrentTxDoomed: boolean = 0 as any; // If collision happened during this Tx

  constructor(id: number, config: SimConfig) {
    this.id = id;
    this.config = config;
    this.resetProtocolState();
  }

  resetProtocolState() {
    this.nb = 0;
    this.be = this.config.minBe;
    this.vcs = 0;
    this.backoffCounter = 0;
    // We do NOT reset state to IDLE here, as this is called during retry setup too
  }

  generateBackoff() {
    const max = Math.pow(2, this.be) - 1;
    this.backoffCounter = Math.floor(Math.random() * (max + 1)) + this.config.pe;
  }
}

export const runSimulation = (config: SimConfig): SimulationResult => {
  const nodes: Node[] = [];
  for (let i = 0; i < config.nodeCount; i++) {
    nodes.push(new Node(i, config));
  }

  const logs: LogEntry[] = [];
  const timeline: TimelineData = {};
  nodes.forEach(n => timeline[n.id] = []);

  const stats: SimStats = {
    totalPacketsGenerated: 0,
    successCount: 0,
    success1st: 0,
    success2nd: 0,
    success3rd: 0,
    failureCount: 0,
    collisionCount: 0,
    totalLatency: 0,
    maxQueueDepth: 0,
    channelIdleTicks: 0,
    channelTxTicks: 0,
    channelCollisionTicks: 0,
    channelBackoffTicks: 0,
  };

  const log = (tick: number, nodeId: number | string, type: LogEntry['type'], message: string) => {
    logs.push({ tick, nodeId, type, message });
  };

  // Constants for Frame Structure
  const LEN_P = 1;
  const LEN_FC = 1;
  const LEN_DATA = config.dataSlots;
  const LEN_RIFS = 1;
  const LEN_ACK_P = 1;
  const LEN_ACK_FC = 1;
  
  // Simulation Loop
  for (let t = 0; t < config.simDuration; t++) {
    
    // --- Phase 1: Physical Channel Check (Who is transmitting?) ---
    // Note: We check 'n.state' at the START of the tick (before update)
    const transmitters = nodes.filter(n => 
      [NodeType.TX_PREAMBLE, NodeType.TX_FC, NodeType.TX_DATA, NodeType.RX_ACK].includes(n.state)
    );
    
    // Note: RIFS is silence, but part of the transaction sequence. 
    // For stats, we count it as "Tx Time" per request.
    const rifsWaiters = nodes.filter(n => n.state === NodeType.WAIT_RIFS);
    
    const isPreambleActive = transmitters.some(n => n.state === NodeType.TX_PREAMBLE);
    const isFcActive = transmitters.some(n => n.state === NodeType.TX_FC);
    const physicalBusy = transmitters.length > 0;
    const collisionOccurring = transmitters.length > 1;

    // --- Channel Utilization Stats ---
    if (collisionOccurring) {
      stats.channelCollisionTicks++;
    } else if (physicalBusy || rifsWaiters.length > 0) {
      // Includes P, FC, Data, ACK and RIFS (if single user or synced)
      stats.channelTxTicks++;
    } else {
      // Channel is Physically Idle
      // Check if anyone is Backing Off (System busy but channel idle)
      const backingOff = nodes.some(n => n.state === NodeType.BACKOFF || n.state === NodeType.BACKOFF_PAUSED);
      if (backingOff) {
        stats.channelBackoffTicks++;
      } else {
        stats.channelIdleTicks++;
      }
    }

    if (collisionOccurring) {
       transmitters.forEach(n => {
         if (!n.isCurrentTxDoomed) {
             n.isCurrentTxDoomed = true;
             stats.collisionCount++;
             log(t, n.id, 'COLLISION', 'Signal overlap detected');
         }
       });
    }

    // --- Phase 2: Node Perception (VCS & Sensing) ---
    const nodesPreUpdate = nodes.map(n => ({ vcs: n.vcs }));

    nodes.forEach((n, idx) => {
      const isTransmitting = transmitters.includes(n);
      
      // VCS Logic (Only if not transmitting)
      if (!isTransmitting) {
        // 1. Hearing Preamble (Collision or Valid) -> Set Penalty
        if (isPreambleActive) {
           n.vcs = Math.max(n.vcs, config.collisionPenalty);
           if (nodesPreUpdate[idx].vcs === 0) {
               log(t, n.id, 'VCS', `Heard Preamble, VCS set to ${config.collisionPenalty}`);
           }
        }

        // 2. Hearing Valid FC -> Set NAV (Exact Duration)
        if (isFcActive && !collisionOccurring) {
           const durationRemaining = LEN_DATA + LEN_RIFS + LEN_ACK_P + LEN_ACK_FC;
           n.vcs = durationRemaining;
           log(t, n.id, 'VCS', `Decoded FC, NAV set to ${durationRemaining}`);
        }

        // Decrement VCS
        if (n.vcs > 0) n.vcs--;
      }
    });

    // --- Phase 3: State Machine Update ---
    nodes.forEach(n => {
      // IMPORTANT: We create the visualization cell based on the state AT THE START of the tick.
      const cell: TimelineCell = { state: n.state };

      // Input Generation - Independent of state (Buffer Logic)
      let shouldGenerate = false;
      if (config.packetGenMode === 'INTERVAL') {
        // Fixed Interval: Generates at 0, 100, 200...
        shouldGenerate = (t % config.packetInterval === 0);
      } else {
        shouldGenerate = Math.random() < config.packetProb;
      }

      if (shouldGenerate) {
        n.packetQueue.push(t); // Store birth tick
        stats.totalPacketsGenerated++;
        stats.maxQueueDepth = Math.max(stats.maxQueueDepth, n.packetQueue.length);
        log(t, n.id, 'INFO', `Packet generated (Queue: ${n.packetQueue.length})`);
      }

      switch (n.state) {
        case NodeType.IDLE:
          if (n.packetQueue.length > 0) {
            n.state = NodeType.SENSING;
            n.resetProtocolState(); // Ensure clean start
          }
          break;

        case NodeType.SENSING:
          // If Channel Idle (Physical + Virtual)
          if (!physicalBusy && n.vcs === 0) {
            n.generateBackoff();
            log(t, n.id, 'INFO', `Start Backoff (${n.backoffCounter})`);

            // If Backoff is 0, we transmit IMMEDIATELY (next tick is Preamble)
            if (n.backoffCounter === 0) {
               n.state = NodeType.TX_PREAMBLE;
               n.txProgress = 0;
               n.isCurrentTxDoomed = false;
            } else {
               n.state = NodeType.BACKOFF;
            }
          }
          break;

        case NodeType.BACKOFF:
        case NodeType.BACKOFF_PAUSED:
          // Check Channel
          const channelFree = !physicalBusy && n.vcs === 0;
          
          if (channelFree) {
            // Resume or Continue
            n.state = NodeType.BACKOFF; 
            cell.state = NodeType.BACKOFF; 
            cell.info = n.backoffCounter;

            // Logic: 
            // 2 -> 1
            // 1 -> Preamble (next tick)
            if (n.backoffCounter > 1) {
              n.backoffCounter--;
            } else {
              // Counter was 1, now 0, so we start TX
              n.state = NodeType.TX_PREAMBLE;
              n.txProgress = 0;
              n.isCurrentTxDoomed = false;
              log(t, n.id, 'INFO', 'Backoff complete, transmitting');
            }
          } else {
            // Pause
            n.state = NodeType.BACKOFF_PAUSED;
            cell.info = n.backoffCounter;
          }
          break;

        case NodeType.TX_PREAMBLE:
          n.txProgress++;
          if (n.txProgress >= LEN_P) {
            n.state = NodeType.TX_FC;
            n.txProgress = 0;
          }
          break;

        case NodeType.TX_FC:
          n.txProgress++;
          if (n.txProgress >= LEN_FC) {
            n.state = NodeType.TX_DATA;
            n.txProgress = 0;
          }
          break;

        case NodeType.TX_DATA:
          n.txProgress++;
          if (n.txProgress >= LEN_DATA) {
            n.state = NodeType.WAIT_RIFS;
            n.txProgress = 0;
          }
          break;

        case NodeType.WAIT_RIFS:
          n.txProgress++;
          if (n.txProgress >= LEN_RIFS) {
             n.state = NodeType.RX_ACK; 
             n.txProgress = 0;
          }
          break;

        case NodeType.RX_ACK:
          n.txProgress++;
          const ackDuration = LEN_ACK_P + LEN_ACK_FC;
          
          if (n.txProgress >= ackDuration) {
            // Transaction Finished. Check success.
            if (!n.isCurrentTxDoomed) {
              // SUCCESS
              const birthTick = n.packetQueue.shift(); // Remove packet from queue
              stats.successCount++;
              if (birthTick !== undefined) {
                 stats.totalLatency += (t - birthTick);
              }
              
              // Stats breakdown
              if (n.nb === 0) stats.success1st++;
              else if (n.nb === 1) stats.success2nd++;
              else stats.success3rd++; // Catch all nb >= 2 (2nd, 3rd, 4th retry etc)

              n.resetProtocolState();
              log(t, n.id, 'SUCCESS', 'ACK received, transaction complete');
              
              if (n.packetQueue.length > 0) n.state = NodeType.SENSING;
              else n.state = NodeType.IDLE;

            } else {
              // FAILURE due to Collision (ACK Timeout/Missing)
              n.nb++;
              if (n.nb > config.maxNb) {
                n.packetQueue.shift(); // Drop packet
                stats.failureCount++;
                n.resetProtocolState();
                n.state = NodeType.FAILED; 
                log(t, n.id, 'DROP', `Max retries (${config.maxNb}) reached. Dropping packet.`);
              } else {
                // Retry logic
                n.be = Math.min(n.be + 1, config.maxBe);
                n.vcs = 0; // Ensure VCS is clear for sensing
                n.backoffCounter = 0; // Will generate new backoff in Sensing
                n.state = NodeType.SENSING;
                log(t, n.id, 'COLLISION', `No ACK. Retrying (NB=${n.nb}, BE=${n.be})`);
              }
            }
          }
          break;
          
        case NodeType.FAILED:
             // Instant transition back to process next packet or Idle
             if (n.packetQueue.length > 0) n.state = NodeType.SENSING;
             else n.state = NodeType.IDLE;
            break;

        case NodeType.COLLISION:
             break;
      }

      // --- Push to Timeline ---
      let visualState = cell.state;
      let isCol = false;
      
      const isTxState = [NodeType.TX_PREAMBLE, NodeType.TX_FC, NodeType.TX_DATA, NodeType.RX_ACK].includes(visualState);
      
      if (isTxState && collisionOccurring) {
          visualState = NodeType.COLLISION;
          isCol = true;
      } else if (visualState === NodeType.FAILED) {
          visualState = NodeType.FAILED;
      }

      timeline[n.id].push({
        state: visualState,
        info: cell.info,
        isCollision: isCol
      });
    });
  }

  return { timeline, logs, stats, duration: config.simDuration };
};
