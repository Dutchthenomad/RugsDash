# 🔌 RUGS.FUN SOCKET SCHEMA FRAMEWORK

**Comprehensive WebSocket event schema and data structure reference for the Rugs.fun prediction system**

---

## 📋 OVERVIEW

This document consolidates all WebSocket event schemas, data structures, and integration patterns for the Rugs.fun side bet prediction system. It serves as the authoritative reference for socket event handling, data validation, and real-time game state processing.

**Coverage:**
- Socket.io event types and schemas
- Game phase integration with WebSocket events
- Data field mappings to unified schema
- Real-time prediction system integration
- Side bet mechanics and event handling

---

## 🎯 PRIMARY WEBSOCKET EVENTS

### gameStateUpdate
**Primary Event**: Real-time game state updates (~250ms frequency during active play)

```typescript
interface GameStateUpdate {
  // Game Identification
  gameId: string;                    // Format: YYYYMMDD-UUID
  active: boolean;                   // Game is currently running
  rugged: boolean;                   // Game has ended/been rugged
  
  // Game Progress
  tickCount: number;                 // Current tick (0-5000 max)
  price: number;                     // Current price multiplier
  tradeCount: number;                // Total trades in current game
  
  // Phase Control
  cooldownTimer: number;             // Milliseconds remaining in cooldown
  allowPreRoundBuys: boolean;        // Presale trading enabled
  
  // Game History (ONLY during rug events)
  gameHistory?: Array<CompletedGame>; // Appears ONLY during rug phase
  
  // Provably Fair
  provablyFair: {
    serverSeedHash: string;          // Current game seed hash
    serverSeed?: string;             // Revealed only during rug
  };
  
  // Real-time Data
  leaderboard: Array<LeaderboardEntry>;
  candles: Array<CandleData>;
  currentCandle: CandleData;
  
  // Statistics
  peakMultiplier: number;
  uniquePlayers: number;
  totalVolume: number;
}
```

### newTrade
**Trade Events**: Individual trade executions

```typescript
interface TradeEvent {
  id: string;                        // Unique trade identifier
  gameId: string;                    // Current game identifier
  playerId: string;                  // Player DID identifier
  type: 'buy' | 'sell';             // Trade direction
  qty: number;                       // Quantity traded
  amount: number;                    // SOL amount
  coin: 'free' | string;            // 'free' for real SOL trades
  tickIndex: number;                 // Tick when trade occurred
  price?: number;                    // Price per unit (for sells)
  timestamp?: number;                // Unix timestamp
}
```

### currentSideBetResult
**Side Bet Results**: Side bet outcome notifications

```typescript
interface SideBetResult {
  playerId: string;                  // Player DID identifier
  gameId: string;                    // Game identifier
  username: string;                  // Player display name
  betAmount: number;                 // Original bet in SOL
  payout: number;                    // Total payout if win
  profit: number;                    // Net profit (payout - betAmount)
  xPayout: number;                   // Multiplier (always 5 for side bets)
  startTick: number;                 // Side bet window start
  endTick: number;                   // Side bet window end (startTick + 40)
  tickIndex: number;                 // Current tick when result processed
  timestamp: number;                 // Unix timestamp
  type: 'payout' | 'loss';          // Outcome type
  coinAddress?: string;              // SOL address for real bets
}
```

---

## 🎮 TRADE EVENT SCHEMAS

### Presale Purchase
**Phase**: PRESALE (cooldownTimer: 0-10000ms, allowPreRoundBuys: true)

```json
{
  "id": "578",
  "gameId": "20250803-eab672a1cfee4345",
  "playerId": "did:privy:cm8nt9b9k00vob82ytx34nzfy",
  "type": "buy",
  "qty": 500,
  "amount": 500,
  "coin": "free",
  "tickIndex": 0
}
```

**Characteristics:**
- Always occurs at `tickIndex: 0` (before game starts)
- Price guaranteed at 1.00x
- Only buy orders allowed
- Positions visible on leaderboard immediately

### Live Game Buy Order
**Phase**: ACTIVE (active: true, tickIndex > 0)

```json
{
  "id": "259",
  "gameId": "20250803-eab672a1cfee4345",
  "playerId": "did:privy:cmcarmnnf01tdl80nw43tsyug",
  "type": "buy",
  "qty": 513.930904499,
  "amount": 65.087,
  "coin": "free",
  "tickIndex": 179
}
```

**Characteristics:**
- Occurs during active gameplay
- Price varies based on current market multiplier
- Real-time position updates on leaderboard

### Live Game Sell Order
**Phase**: ACTIVE (active: true, tickIndex > 0)

```json
{
  "id": "290",
  "gameId": "20250803-eab672a1cfee4345",
  "playerId": "did:privy:cmdgduklg00ztl70nhbramq8u",
  "type": "sell",
  "tickIndex": 203,
  "amount": 152.323001727,
  "coin": "free",
  "price": 0.2850563714358829,
  "qty": 534.360979058
}
```

**Characteristics:**
- Includes `price` field for sell orders
- Real-time P&L calculation
- Position reduction reflected immediately

---

## 🎲 SIDE BET EVENT SCHEMAS

### Side Bet Placement
**Event**: Side bet initiated

```json
{
  "playerId": "did:privy:cmdv1ztmc000oie0basyabaos",
  "gameId": "20250803-eab672a1cfee4345",
  "username": "DNBDD",
  "betAmount": 0.02,
  "xPayout": 5,
  "coinAddress": "So11111111111111111111111111111111111111112",
  "endTick": 342,
  "startTick": 302,
  "tickIndex": 302,
  "timestamp": 1754188196413,
  "type": "placed"
}
```

**Side Bet Mechanics:**
- **Window Size**: Exactly 40 ticks (endTick - startTick = 40)
- **Payout**: 5:1 ratio (xPayout always 5)
- **Win Condition**: Game must survive past endTick
- **Loss Condition**: Game rugs before endTick
- **Timing**: Can be placed at any tickIndex during active phase

### Side Bet Result - Win
**Event**: Side bet payout notification

```json
{
  "playerId": "did:privy:cma094vht019il80np6aidhqd",
  "gameId": "20250803-8105c03cf69e46e4",
  "username": "N0m4D",
  "betAmount": 0.001,
  "payout": 0.005,
  "endTick": 354,
  "startTick": 314,
  "tickIndex": 314,
  "timestamp": 1754182427417,
  "type": "payout",
  "profit": 0.004,
  "xPayout": 5
}
```

**Win Calculations:**
- `payout = betAmount * xPayout` (5x multiplier)
- `profit = payout - betAmount`
- Triggered when `currentTickCount > endTick`

### Side Bet Result - Loss
**Event**: Side bet loss (game rugged before endTick)

```typescript
interface SideBetLoss {
  playerId: string;
  gameId: string;
  username: string;
  betAmount: number;
  payout: 0;                         // No payout on loss
  profit: number;                    // Negative value (-betAmount)
  xPayout: 5;                        // Still shows 5x potential
  startTick: number;
  endTick: number;
  tickIndex: number;                 // Tick when rug occurred
  timestamp: number;
  type: 'loss';
}
```

---

## 🔄 GAME PHASE INTEGRATION

### Phase Detection via WebSocket Events

```typescript
function detectPhaseFromSocket(data: GameStateUpdate): GamePhase {
  // RUG PHASE - Dual Event Pattern
  if (data.gameHistory && Array.isArray(data.gameHistory)) {
    if (data.active === true && data.rugged === true) {
      return 'RUG_EVENT_1_SEED_REVEAL';
    }
    if (data.active === false && data.rugged === true) {
      return 'RUG_EVENT_2_NEW_GAME_SETUP';
    }
  }
  
  // PRESALE PHASE
  if (data.cooldownTimer > 0 && 
      data.cooldownTimer <= 10000 && 
      data.allowPreRoundBuys === true) {
    return 'PRESALE_PHASE';
  }
  
  // COOLDOWN PHASE
  if (data.cooldownTimer > 10000 && 
      data.rugged === true && 
      data.active === false) {
    return 'COOLDOWN_PHASE';
  }
  
  // ACTIVE PHASE
  if (data.active === true && data.tickCount > 0) {
    return 'ACTIVE_GAMEPLAY';
  }
  
  // GAME ACTIVATION
  if (data.active === true && data.tickCount === 0) {
    return 'GAME_ACTIVATION';
  }
  
  return 'UNKNOWN_PHASE';
}
```

### WebSocket Event Mapping by Phase

| Phase | Primary Events | Data Available | Bot Actions |
|-------|---------------|----------------|-------------|
| **ACTIVE** | `gameStateUpdate`, `newTrade` | Real-time price, leaderboard, trades | Execute trading strategies, monitor rug risk |
| **RUGGED** | `gameStateUpdate` (dual events) | `gameHistory`, revealed seeds | Capture game completion, reset positions |
| **PRESALE** | `gameStateUpdate`, `newTrade` | Countdown timer, presale positions | Evaluate entry opportunities |
| **COOLDOWN** | `gameStateUpdate` | Settlement data | Prepare for next game |

---

## 📊 DATA FIELD MAPPING TO UNIFIED SCHEMA

### Core Game Metrics
| Socket Field | Unified Schema Field | Type | Description |
|--------------|---------------------|------|-------------|
| `gameId` | `gameId` | String | Unique game identifier |
| `tickCount` | `duration_ticks` | Number | Game survival time |
| `price` | `final_price` | Number | Current/final price multiplier |
| `peakMultiplier` | `peak_multiplier` | Number | Highest price reached |
| `tradeCount` | `totalTrades` | Number | Total trade count |
| `uniquePlayers` | `uniquePlayers` | Number | Participant count |

### Trading Analytics
| Socket Field | Unified Schema Field | Type | Description |
|--------------|---------------------|------|-------------|
| `totalVolume` | `total_volume` | Number | Total trading volume |
| `leaderboard` | `playerActivity` | Object | Per-player trading data |
| Trade `type: 'buy'` | `buy_orders` | Number | Buy order count |
| Trade `type: 'sell'` | `sell_orders` | Number | Sell order count |

### Risk Indicators
| Socket Field | Calculated Field | Formula | Bayesian Use |
|--------------|------------------|---------|--------------|
| `tickCount < 10` | `is_instarug` | `tickCount <= 6` | Critical risk detection |
| `price` changes | `price_volatility` | Price movement variance | Volatility analysis |
| Player concentration | `top_player_volume_ratio` | Max player / total volume | Whale risk |

---

## 🤖 PREDICTION SYSTEM INTEGRATION

### Real-time Data Processing Pipeline

```typescript
class SocketDataProcessor {
  processGameStateUpdate(data: GameStateUpdate) {
    // Phase Detection
    const phase = detectPhaseFromSocket(data);
    
    // Risk Analysis
    const riskMetrics = {
      instaragRisk: data.tickCount < 10,
      volatilityLevel: calculateVolatility(data.price),
      concentrationRisk: analyzeLeaderboard(data.leaderboard)
    };
    
    // Side Bet Opportunities
    const sideBetOpportunities = evaluateSideBetWindows(data.tickCount);
    
    // Prediction Updates
    updatePredictionEngine({
      gameState: data,
      phase: phase,
      riskMetrics: riskMetrics,
      opportunities: sideBetOpportunities
    });
  }
  
  processSideBetResult(data: SideBetResult) {
    // Track Prediction Accuracy
    const wasCorrect = (data.type === 'payout') === 
      predictedSurvival(data.startTick, data.endTick);
    
    // Update Learning Model
    updateBayesianModel({
      startTick: data.startTick,
      endTick: data.endTick,
      actual: data.type === 'payout',
      predicted: wasCorrect
    });
  }
}
```

### Side Bet Strategy Integration

```typescript
interface SideBetOpportunity {
  currentTick: number;
  proposedStartTick: number;
  proposedEndTick: number;
  survivalProbability: number;
  expectedValue: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';
}

function evaluateSideBetFromSocket(data: GameStateUpdate): SideBetOpportunity {
  const currentTick = data.tickCount;
  const startTick = currentTick;
  const endTick = currentTick + 40;
  
  // Historical Analysis
  const historicalSurvival = calculateSurvivalProbability(endTick);
  
  // Current Game Risk Factors
  const gameRiskFactors = {
    isEarlyGame: currentTick < 50,
    priceVolatility: analyzeRecentPriceMovement(data),
    playerConcentration: analyzeLeaderboardConcentration(data.leaderboard),
    tradingVelocity: data.tradeCount / data.tickCount
  };
  
  // Bayesian Confidence Calculation
  const bayesianConfidence = calculateBayesianConfidence({
    historicalData: historicalSurvival,
    currentFactors: gameRiskFactors,
    phase: 'ACTIVE'
  });
  
  return {
    currentTick,
    proposedStartTick: startTick,
    proposedEndTick: endTick,
    survivalProbability: bayesianConfidence.probability,
    expectedValue: (bayesianConfidence.probability * 4) - 1, // 5:1 payout
    confidence: bayesianConfidence.confidence,
    riskLevel: assessRiskLevel(bayesianConfidence),
    recommendation: generateRecommendation(bayesianConfidence)
  };
}
```

---

## 🔍 DATA VALIDATION & FILTERING

### Trade Event Filtering

```typescript
function isRealTrade(trade: TradeEvent): boolean {
  // Filter for real SOL trades only
  return trade.coin === 'free' || trade.coin === null;
}

function isPracticeTrade(trade: TradeEvent): boolean {
  // Practice trades have non-null coinAddress
  return trade.coin !== 'free' && trade.coin !== null;
}
```

### Data Quality Checks

```typescript
function validateGameStateData(data: GameStateUpdate): boolean {
  // Required fields validation
  if (!data.gameId || typeof data.active !== 'boolean') {
    return false;
  }
  
  // Phase consistency validation
  if (data.active && data.cooldownTimer > 0) {
    return false; // Active games shouldn't have cooldown
  }
  
  // GameHistory validation
  if (data.gameHistory && (!data.rugged)) {
    return false; // GameHistory only appears during rug events
  }
  
  return true;
}
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Event Processing Pipeline

```typescript
class OptimizedSocketHandler {
  private gameStateBuffer: GameStateUpdate[] = [];
  private tradeBuffer: TradeEvent[] = [];
  
  // Batch process events for performance
  processInBatches() {
    if (this.gameStateBuffer.length > 0) {
      this.processBatchedGameStates(this.gameStateBuffer);
      this.gameStateBuffer = [];
    }
    
    if (this.tradeBuffer.length > 0) {
      this.processBatchedTrades(this.tradeBuffer);
      this.tradeBuffer = [];
    }
  }
  
  // Critical events processed immediately
  processImmediately(data: GameStateUpdate) {
    // Rug events need immediate processing
    if (data.gameHistory) {
      this.processRugEvent(data);
      return;
    }
    
    // Phase transitions need immediate processing
    const phase = detectPhaseFromSocket(data);
    if (this.isPhaseTransition(phase)) {
      this.processPhaseTransition(data, phase);
      return;
    }
    
    // Buffer regular updates
    this.gameStateBuffer.push(data);
  }
}
```

---

## 📈 IMPLEMENTATION GUIDELINES

### WebSocket Connection Setup

```typescript
import io from 'socket.io-client';

const socket = io('wss://backend.rugs.fun', {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Event Handlers
socket.on('gameStateUpdate', (data: GameStateUpdate) => {
  processor.processGameStateUpdate(data);
});

socket.on('newTrade', (data: TradeEvent) => {
  if (isRealTrade(data)) {
    processor.processTradeEvent(data);
  }
});

socket.on('currentSideBetResult', (data: SideBetResult) => {
  processor.processSideBetResult(data);
});
```

### Error Handling & Reconnection

```typescript
socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  // Reset game state if connection lost during active game
  if (reason === 'io server disconnect') {
    resetGameState();
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Implement exponential backoff
  setTimeout(() => socket.connect(), backoffDelay);
});
```

---

## 🎯 PRODUCTION CONSIDERATIONS

### Data Persistence Strategy

```typescript
interface PersistenceLayer {
  // Store complete game records
  saveGameHistory(game: CompletedGame): Promise<void>;
  
  // Store real-time prediction accuracy
  savePredictionResult(result: PredictionResult): Promise<void>;
  
  // Store side bet outcomes for learning
  saveSideBetResult(result: SideBetResult): Promise<void>;
  
  // Retrieve historical patterns
  getHistoricalPatterns(lookback: number): Promise<HistoricalData>;
}
```

### Monitoring & Analytics

```typescript
interface SocketMetrics {
  eventsPerSecond: number;
  connectionUptime: number;
  predictionAccuracy: number;
  sideBetPerformance: {
    totalBets: number;
    winRate: number;
    profitLoss: number;
  };
}
```

---

## 📚 REFERENCE SUMMARY

### Event Types
- **gameStateUpdate**: Primary game state (250ms frequency)
- **newTrade**: Individual trade executions
- **currentSideBetResult**: Side bet outcomes

### Key Data Structures
- **GameStateUpdate**: Complete game state with phase detection
- **TradeEvent**: Trade execution details with player/amount info
- **SideBetResult**: Side bet outcome with profit/loss calculations

### Integration Points
- **Game Phase Detection**: Real-time phase identification
- **Prediction Engine**: Bayesian confidence calculations
- **Risk Assessment**: Multi-factor risk analysis
- **Side Bet Strategy**: 40-tick window optimization

### Production Requirements
- **Data Validation**: Comprehensive event validation
- **Performance**: Batched processing for high-frequency events
- **Persistence**: Historical data storage for learning
- **Monitoring**: Real-time accuracy and performance tracking

---

**Document Version**: 1.0  
**Last Updated**: August 2025  
**Schema Coverage**: Complete WebSocket event set for rugs.fun prediction system