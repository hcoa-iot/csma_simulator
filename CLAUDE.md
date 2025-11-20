# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个 **CSMA/CA（Carrier Sense Multiple Access with Collision Avoidance）无线协议仿真器**，用于可视化和分析 802.15.4-style 协议的行为。该应用是一个纯前端 React + TypeScript + Vite 应用，使用 Tailwind CSS（通过内联类）构建。

**核心功能**：
- 离散事件仿真引擎（Discrete-event simulation）
- 实时时间线可视化（Timeline rendering）
- 碰撞检测与统计分析
- 多节点并发传输模拟

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

这是整个项目的核心。包含：

- **Node Class**: 状态机实现（FSM），每个节点独立执行 CSMA/CA 协议
- **runSimulation()**: 主仿真循环 - **critically important**

**Simulation Loop Structure** (critical for understanding):
```typescript
for (t = 0; t < simDuration; t++) {
  Phase 1: Physical Channel Check (谁在传输?)
  Phase 2: Node Perception (VCS/NAV更新)
  Phase 3: State Machine Update (节点状态转换)
  Phase 4: Timeline Recording (可视化数据生成)
}
```

**节点状态机 (NodeType enum)**:
```
IDLE → SENSING → BACKOFF → TX_PREAMBLE → TX_FC → TX_DATA
  → WAIT_RIFS → RX_ACK → (SUCCESS or COLLISION/RETRY)
```

**关键协议参数**:
- `pe`: Priority/Preamble slots (固定延迟)
- `minBe/maxBe`: Backoff exponent range (指数退避)
- `maxNb`: Max retries (最大重试次数)
- `collisionPenalty`: VCS duration when hearing preamble

**VCS (Virtual Carrier Sense) Logic** (`simulator.ts:133-151`):
- 听到 Preamble → 设置 `collisionPenalty` ticks 的 NAV
- 解码 FC (无碰撞) → 精确计算剩余传输时间
- 仅当 `physicalBusy=false AND vcs=0` 才认为信道空闲

#### 2. **Type System** (`types.ts`)

**完整的类型定义**，理解这些是理解整个系统的钥匙：

- `SimConfig`: 全局配置（协议参数 + 场景参数）
- `TimelineData`: `{ [nodeId]: TimelineCell[] }` - 每个 tick 的节点状态快照
- `SimStats`: 统计数据（成功/失败/碰撞/信道利用率）

**重要**: `TimelineCell.info` 用于显示 Backoff 计数器，这是调试协议行为的关键。

#### 3. **UI Components** (`components/`)

- **ConfigurationPanel**: 左侧参数配置面板（双列布局 Global/Protocol/Scenario）
- **Timeline**: 核心可视化组件
  - 虚拟滚动优化（只渲染可见区域 + BUFFER_TICKS）
  - 支持缩放（cellWidth 10-40px）
  - Sticky 列显示节点 ID
- **StatsPanel**: 统计看板（成功率、碰撞率、信道利用率）
- **LogPanel**: 事件日志（可点击跳转到对应 tick）

### Critical Implementation Details

#### Collision Detection (`simulator.ts:96-123`)

```typescript
const transmitters = nodes.filter(n =>
  [TX_PREAMBLE, TX_FC, TX_DATA, RX_ACK].includes(n.state)
);
const collisionOccurring = transmitters.length > 1;
```

**碰撞的判定是 physical overlap**：两个或更多节点同时处于传输状态。

- 碰撞时设置 `isCurrentTxDoomed = true`
- ACK 阶段检查此标志决定成功/重试
- 视觉上用 `COLLISION` 状态替换正常的 TX 状态

#### Backoff Mechanism (`simulator.ts:36-39, 199-227`)

```typescript
generateBackoff() {
  const max = Math.pow(2, this.be) - 1;
  this.backoffCounter = Math.floor(Math.random() * (max + 1)) + this.config.pe;
}
```

**Critical**: Backoff counter 包含 `pe` 固定延迟，这是 802.15.4 的特性。

**Backoff 暂停逻辑**:
- 信道忙 → 状态切换到 `BACKOFF_PAUSED`（计数器冻结）
- 信道恢复空闲 → 恢复 `BACKOFF`，继续倒数

#### Timeline Rendering Optimization (`Timeline.tsx:50-100`)

使用 **viewport culling** 和 **React.memo** 优化性能：

```typescript
const visibleStartTick = Math.max(0, Math.floor(scrollLeft / cellWidth) - BUFFER_TICKS);
const visibleEndTick = Math.min(simDuration, Math.ceil((scrollLeft + viewportWidth) / cellWidth) + BUFFER_TICKS);
```

**只渲染可见窗口 ± 20 ticks** 的单元格。对于 10000+ ticks 的长仿真至关重要。

#### Success Rate Statistics (`simulator.ts:276-278`)

```typescript
if (n.nb === 0) stats.success1st++;
else if (n.nb === 1) stats.success2nd++;
else stats.success3rd++; // nb >= 2
```

**注意**: `success3rd` 实际上是 "第三次及以上尝试成功"，不仅仅是第三次。

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
