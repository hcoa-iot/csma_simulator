# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **CSMA/CA (Carrier Sense Multiple Access with Collision Avoidance) wireless protocol simulator** for visualizing and analyzing 802.15.4-style protocol behavior. The application is a pure frontend React + TypeScript + Vite app, built with Tailwind CSS (via inline classes).

**Core Features**:
- Discrete-event simulation engine
- Real-time timeline visualization
- Collision detection and statistical analysis
- Multi-node concurrent transmission simulation

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Architecture Overview

### Core Data Flow

```
SimConfig → runSimulation() → SimulationResult
    ↓                              ↓
ConfigPanel                    Timeline + Stats + Logs
```

**Single-direction flow**: User configures parameters → Runs simulation → Views results. No incremental/live simulation.

### Key Modules

#### 1. **Simulation Engine** (`services/simulator.ts`)

This is the core of the entire project. It contains:

- **Node Class**: Finite State Machine (FSM) implementation, each node independently executes the CSMA/CA protocol
- **runSimulation()**: Main simulation loop - **critically important**

**Simulation Loop Structure** (critical for understanding):
```typescript
for (t = 0; t < simDuration; t++) {
  Phase 1: Physical Channel Check (Who is transmitting?)
  Phase 2: Node Perception (VCS/NAV updates)
  Phase 3: State Machine Update (Node state transitions)
  Phase 4: Timeline Recording (Visualization data generation)
}
```

**Node State Machine (NodeType enum)**:
```
IDLE → SENSING → BACKOFF → TX_PREAMBLE → TX_FC → TX_DATA
  → WAIT_RIFS → RX_ACK → (SUCCESS or COLLISION/RETRY)
```

**Key Protocol Parameters**:
- `pe`: Priority/Preamble slots (fixed delay)
- `minBe/maxBe`: Backoff exponent range (exponential backoff)
- `maxNb`: Max retries (maximum retry attempts)
- `collisionPenalty`: VCS duration when hearing preamble

**VCS (Virtual Carrier Sense) Logic** (`simulator.ts:133-151`):
- Hearing Preamble → Set NAV for `collisionPenalty` ticks
- Decoding FC (no collision) → Calculate precise remaining transmission time
- Channel is considered idle only when `physicalBusy=false AND vcs=0`

#### 2. **Type System** (`types.ts`)

**Complete type definitions** - understanding these is the key to understanding the entire system:

- `SimConfig`: Global configuration (protocol parameters + scenario parameters)
- `TimelineData`: `{ [nodeId]: TimelineCell[] }` - Node state snapshot for each tick
- `SimStats`: Statistics (success/failure/collision/channel utilization)

**Important**: `TimelineCell.info` is used to display the Backoff counter, which is crucial for debugging protocol behavior.

#### 3. **UI Components** (`components/`)

- **ConfigurationPanel**: Left-side parameter configuration panel (two-column layout: Global/Protocol/Scenario)
- **Timeline**: Core visualization component
  - Virtual scrolling optimization (only renders visible area + BUFFER_TICKS)
  - Supports zooming (cellWidth 10-40px)
  - Sticky column displays node IDs
- **StatsPanel**: Statistics dashboard (success rate, collision rate, channel utilization)
- **LogPanel**: Event log (clickable to jump to corresponding tick)

### Critical Implementation Details

#### Collision Detection (`simulator.ts:96-123`)

```typescript
const transmitters = nodes.filter(n =>
  [TX_PREAMBLE, TX_FC, TX_DATA, RX_ACK].includes(n.state)
);
const collisionOccurring = transmitters.length > 1;
```

**Collision is determined by physical overlap**: Two or more nodes are simultaneously in transmit state.

- On collision, set `isCurrentTxDoomed = true`
- ACK phase checks this flag to decide success/retry
- Visually replaces normal TX state with `COLLISION` state

#### Backoff Mechanism (`simulator.ts:36-39, 199-227`)

```typescript
generateBackoff() {
  const max = Math.pow(2, this.be) - 1;
  this.backoffCounter = Math.floor(Math.random() * (max + 1)) + this.config.pe;
}
```

**Critical**: Backoff counter includes the `pe` fixed delay, which is a feature of 802.15.4.

**Backoff Pause Logic**:
- Channel busy → State switches to `BACKOFF_PAUSED` (counter freezes)
- Channel becomes idle → Resume `BACKOFF`, continue countdown

#### Timeline Rendering Optimization (`Timeline.tsx:50-100`)

Uses **viewport culling** and **React.memo** for performance optimization:

```typescript
const visibleStartTick = Math.max(0, Math.floor(scrollLeft / cellWidth) - BUFFER_TICKS);
const visibleEndTick = Math.min(simDuration, Math.ceil((scrollLeft + viewportWidth) / cellWidth) + BUFFER_TICKS);
```

**Only renders cells in visible window ± 20 ticks**. Critical for long simulations with 10000+ ticks.

#### Success Rate Statistics (`simulator.ts:276-278`)

```typescript
if (n.nb === 0) stats.success1st++;
else if (n.nb === 1) stats.success2nd++;
else stats.success3rd++; // nb >= 2
```

**Note**: `success3rd` actually means "success on third or later attempts", not just the third attempt.

## Common Development Tasks

### Adding New Node States

1. Update `NodeType` enum in `types.ts`
2. Add state transition logic in `simulator.ts` switch statement (line 174-315)
3. Add color mapping in `Timeline.tsx` `getColor()` function
4. Update legend if state is user-visible

### Modifying Protocol Parameters

1. Add field to `SimConfig` in `types.ts`
2. Update `DEFAULT_CONFIG` in `App.tsx`
3. Add input field in `ConfigurationPanel.tsx`
4. Use parameter in `simulator.ts` logic

### Debugging Simulation Issues

**Use the Log Panel**: Every critical event is logged with tick number and node ID.

**Common debug workflow**:
1. Run simulation with small `simDuration` (e.g., 500 ticks)
2. Find suspicious log entry (e.g., unexpected collision)
3. Click log to jump to that tick in timeline
4. Inspect node states visually + check VCS values in logs

**Key logs to watch**:
- `VCS` logs show NAV updates (Virtual Carrier Sense)
- `COLLISION` logs pinpoint overlap events
- `Backoff` logs show when counter is generated

## Important Constraints

1. **No Python/Backend**: Pure frontend simulation, all computation in browser
2. **Single-threaded**: Large simulations (>10000 ticks, >10 nodes) will freeze UI briefly
3. **No persistence**: Simulation results are ephemeral (no save/load)
4. **Fixed slot duration**: `slotDurationUs` is for display only, simulation uses logical ticks

## Known Quirks

1. **RIFS counted as Tx time** (`simulator.ts:101`): Although channel is silent during RIFS, it's counted in `channelTxTicks` per design decision
2. **Gemini API key in vite.config**: Unused template artifact, can be ignored
3. **Timeline zoom pivot** (`Timeline.tsx:50`): Maintains visual scroll position when zooming, complex logic

## Protocol-Specific Notes

This implements a **slotted CSMA/CA** variant similar to IEEE 802.15.4:

- **Frame structure**: Preamble(1) + FC(1) + Data(N) + RIFS(1) + ACK_P(1) + ACK_FC(1)
- **Backoff freeze**: Counter pauses when channel busy (unlike WiFi's fixed backoff)
- **Binary exponential backoff**: BE increases per retry, capped at `maxBe`
- **VCS (NAV)**: Two-stage: penalty on preamble, exact duration on FC decode

**Simplifications from real 802.15.4**:
- No CRC/FCS errors (only physical collisions)
- Perfect ACK reception if no collision
- No capture effect (stronger signal wins)
- Synchronous slotted time (real systems have timing jitter)
