# 📊 UNIFIED PRNG GAME DATA SCHEMA REFERENCE

**Comprehensive reference for all PRNG game data fields, structures, and analysis metrics**

---

## 🎯 OVERVIEW

This document consolidates all data schema information for PRNG game records, providing a single authoritative reference for:
- Raw data fields from game recordings
- Derived metrics from CSV datasets
- Risk calculation formulas
- Data structure specifications
- Bayesian analysis applications

**Coverage**: 170+ games across multiple datasets
- Raw JSONL game data (50+ distinct fields)
- Basic CSV dataset: `rugs_bayesian_data.csv` (7 fields)
- Expanded CSV dataset: `expanded_rugs_data.csv` (31 fields)
- Player-integrated dataset: `player_integrated_data.csv` (37 fields)

---

## 📋 COMPLETE FIELD REFERENCE

### 🔑 PRIMARY IDENTIFIERS & METADATA

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `gameId` | String | Unique game identifier (YYYYMMDD-UUID format) | All datasets | Game tracking, correlation analysis |
| `recordingStart` | String | ISO timestamp when game recording started | Raw data | Time-based analysis, session patterns |
| `recordingEnd` | String | ISO timestamp when rug was detected | Raw data | Duration calculations |
| `timestamp` | String | Game start time in ISO 8601 format | CSV datasets | Chronological ordering |
| `duration` | Number | Game duration in seconds | Raw data | Basic survival metric |
| `reason` | String | End reason (always "RUG_DETECTED") | Raw data | Event categorization |
| `totalEvents` | Number | Total events captured during game | Raw data | Activity intensity indicator |

### 🎯 CORE SURVIVAL METRICS

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| **`duration_ticks`** | Number | Total ticks before rug (same as `finalTick`) | All datasets | **Primary survival probability metric** |
| **`peak_multiplier`** | Number | Highest price multiplier reached | All datasets | **Peak performance prediction** |
| **`is_instarug`** | Boolean | TRUE if rugged within first 10 ticks | All datasets | **Critical risk categorization** |
| `final_price` | Number | Last recorded price before rug | All datasets | **Exit timing optimization** |
| `rug_tick` | Number | Tick when rug occurred (same as duration_ticks) | Basic CSV | Rug timing analysis |

### 📈 PRICE ANALYTICS

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `priceRange.min` | Number | Lowest price reached in game | Raw data | Volatility measurement |
| `priceRange.max` | Number | Highest price reached (same as peak_multiplier) | Raw data | Range analysis |
| `max_price` | Number | Highest price (identical to peak_multiplier) | Expanded CSV | Price range calculation |
| `min_price` | Number | Lowest price recorded | Expanded CSV | Volatility bounds |
| `price_range_ratio` | Number | max_price ÷ min_price | Expanded CSV | Volatility indicator |
| `price_volatility` | Number | Average magnitude of price changes | Expanded CSV | Risk assessment |
| `final_price_drop_ratio` | Number | final_price ÷ peak_multiplier | Expanded CSV | Exit risk metric |
| `time_to_peak` | Number | Ticks to reach peak multiplier | Expanded CSV | Momentum analysis |
| `ticks_from_peak_to_rug` | Number | Ticks from peak until rug | Expanded CSV | Peak sustainability |

### 💹 TRADING ACTIVITY

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `totalTrades` | Number | Total trades executed | Raw data | Activity indicator |
| `buy_orders` | Number | Total buy orders placed | Expanded/Player CSV | Market sentiment |
| `sell_orders` | Number | Total sell orders placed | Expanded/Player CSV | Profit-taking behavior |
| `buy_sell_ratio` | Number | buy_orders ÷ sell_orders | Expanded/Player CSV | Market pressure |
| `total_volume` | Number | Total trading volume | Expanded CSV | Liquidity metric |
| `volumeByTick` | Object | Volume per tick mapping | Raw data | Activity distribution |
| `early_volume_ratio` | Number | Volume in first half of game | Expanded CSV | Early activity concentration |
| `late_volume_ratio` | Number | Volume in second half (1 - early_volume_ratio) | Expanded CSV | Late activity patterns |

### 👥 PLAYER METRICS

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `uniquePlayers` | Number | Total unique participants | Raw/Expanded CSV | Participation density |
| `players_actually_trading` | Number | Players who placed trades | Player CSV | True participation |
| `player_concentration_ratio` | Number | Trading players ÷ total players | Expanded CSV | Engagement rate |
| `avg_trades_per_player` | Number | Average trades per active player | Player CSV | Trading intensity |
| `avg_volume_per_player` | Number | Average volume per active player | Player CSV | Position sizing |
| `max_player_volume_ratio` | Number | Largest player volume ÷ total volume | Expanded CSV | Whale concentration |
| `top_player_volume_ratio` | Number | Same as max_player_volume_ratio | Player CSV | **Concentration risk** |

### 🏆 PLAYER PERFORMANCE

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| **`profitable_player_ratio`** | Number | Profitable players ÷ total trading players | Player CSV | **Success rate metric** |
| `profitable_players` | Number | Count of profitable players | Player CSV | Absolute success count |
| `total_profits` | Number | Sum of all positive P&L | Player CSV | Market efficiency |
| `total_losses` | Number | Sum of absolute negative P&L | Player CSV | Risk exposure |
| `profit_loss_ratio` | Number | total_profits ÷ total_losses | Player CSV | Market balance |

### 🎮 PLAYER BEHAVIOR TYPES

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `scalpers` | Number | High-frequency traders (≥5 trades, volume < 0.1) | Player CSV | Market maker activity |
| `whales` | Number | Large traders (≤2 trades, volume > 1.0) | Player CSV | Big money influence |
| `hodlers` | Number | Buy-only players (never sold) | Player CSV | Diamond hands metric |
| `flippers` | Number | Balanced traders (≥4 trades, equal buy/sell) | Player CSV | Active trading |
| `early_birds` | Number | Players entering in first 30% | Player CSV | Early adoption |
| `late_joiners` | Number | Players entering after 70% | Player CSV | FOMO indicator |
| `regular_traders` | Number | Players not fitting other patterns | Player CSV | Baseline behavior |

### 🎓 PLAYER EXPERIENCE

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `avg_player_level` | Number | Average experience level of traders | Player CSV | Expertise indicator |
| `high_level_players` | Number | Players with level > 30 | Player CSV | Expert participation |
| `high_level_ratio` | Number | High-level players ÷ total traders | Player CSV | Expertise concentration |

### ⏱️ TIMING METRICS

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `avg_tick_interval` | Number | Average time between ticks (ms) | Expanded CSV | Game speed |
| `tick_interval_variance` | Number | Variance in tick intervals | Expanded CSV | Rhythm consistency |
| `max_tick_gap` | Number | Longest interval between ticks | Expanded CSV | Anomaly detection |
| `game_acceleration` | Number | (early_interval - late_interval) ÷ early_interval | Expanded CSV | Speed changes |
| `tickIntervals[]` | Array | Time gaps between all ticks | Raw data | Detailed rhythm analysis |

### 🎯 ENTRY TIMING

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `early_entry_players` | Number | Players entering in first 30% | Player CSV | Early adoption count |
| `early_entry_ratio` | Number | Early players ÷ total traders | Player CSV | Early adoption rate |
| `late_entry_players` | Number | Players entering in last 30% | Player CSV | FOMO count |

### ⚠️ RISK SCORING

| Field Name | Type | Description | Source | Risk Calculation |
|------------|------|-------------|--------|-----------------|
| **`composite_risk_score`** | Number (0-1) | Overall risk assessment | Expanded/Player CSV | See formulas below |
| `duration_risk` | Number (0-1) | Risk based on game length | Expanded/Player CSV | See formulas below |
| `multiplier_risk` | Number (0-1) | Risk based on peak multiplier | Expanded CSV | min(peak_multiplier / 10, 1) |
| `volume_risk` | Number (0-1) | Risk based on trading volume | Expanded CSV | min(total_volume / 100, 1) |
| `concentration_risk` | Number (0-1) | Risk based on player concentration | Player CSV | top_player_volume_ratio |
| `activity_risk` | Number (0-1) | Risk based on trading activity | Player CSV | min(total_trades / 100, 1) |

### 📊 EVENT TRACKING

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `gameStateUpdates` | Number | Game state change events | Raw data | System activity |
| `eventTypes.gameStateUpdate` | Number | State updates count | Raw data | Update frequency |
| `eventTypes.battleEventQueueUpdate` | Number | Battle queue events | Raw data | Player engagement |
| `eventTypes.battleEventUpdate` | Number | Battle events | Raw data | Competition level |
| `eventTypes.newTrade` | Number | Trade events | Raw data | Trading intensity |
| `eventTypes.newChatMessage` | Number | Chat messages | Raw data | Social activity |

### 🕒 HIGH-PRECISION TIMING

| Field Name | Type | Description | Source | Bayesian Use |
|------------|------|-------------|--------|--------------|
| `rugEventTiming.local_epoch_ms` | Number | Local epoch milliseconds | Raw data | Precise timing |
| `rugEventTiming.unix_timestamp` | Number | Unix timestamp | Raw data | Time correlation |
| `rugEventTiming.performance_now` | Number | Performance timer value | Raw data | System timing |
| `rugEventTiming.collector_version` | String | Data collector version | Raw data | Data quality |

---

## 🧮 RISK CALCULATION FORMULAS

### Duration Risk
- **Expanded Dataset**: `duration_risk = 1 - (duration_ticks / 1000)`
- **Player-Integrated Dataset**: `duration_risk = max(0, 1 - (duration_ticks / 500))`
- Higher values indicate shorter, riskier games

### Composite Risk Score
- **Expanded Dataset**: 
  ```
  composite_risk = (0.4 × duration_risk) + (0.3 × multiplier_risk) + (0.3 × volume_risk)
  ```
- **Player-Integrated Dataset**: 
  ```
  composite_risk = (0.4 × duration_risk) + (0.3 × concentration_risk) + (0.3 × activity_risk)
  ```

---

## 📊 ADVANCED DATA STRUCTURES

### Price Progression Array
Each game contains a complete price history:
```
priceProgression[]: {
  tick: Number,      // Tick number
  price: Number,     // Price at tick
  timestamp: String  // ISO timestamp
}
```

### Player Activity Object
Detailed per-player trading data:
```
playerActivity[playerId]: {
  trades: Number,    // Trade count
  volume: Number     // Total volume
}
```

### Events Array
Complete event stream with:
- Event timestamps
- Event types
- Full event data (game states, trades, leaderboard updates)

---

## 📈 STATISTICAL INSIGHTS

### Duration Distribution (Last 100 Games)
- **Mean**: 210.2 ticks
- **Median**: 147.5 ticks
- **Range**: 2-1334 ticks
- **Distribution**: Right-skewed with long tail

### Peak Multiplier Distribution
- **Mean**: 4.17x
- **Median**: 1.84x
- **Range**: 1.00x-53.41x
- **Distribution**: Heavily right-skewed

### Instarug Statistics
- **Rate**: 8.0% (8/100 games)
- **Definition**: Games ending within first 10 ticks
- **Risk Window**: Critical first 10 ticks

---

## 🎯 BAYESIAN APPLICATIONS

### Primary Risk Factors
1. **Duration Risk**: Probability distributions based on `duration_ticks`
2. **Peak Risk**: Likelihood functions using `peak_multiplier`
3. **Concentration Risk**: Player dominance via `top_player_volume_ratio`
4. **Activity Risk**: Trading intensity patterns

### Multi-Factor Models
Combine multiple data points:
- Duration + Peak + Volume patterns
- Player concentration + Trading velocity
- Price volatility + Timing irregularities
- Entry timing + Player experience levels

### Key Probability Calculations

**Survival Probability to Tick N**:
```
P(survive to N) = COUNT(duration_ticks ≥ N) / COUNT(all games)
```

**Expected Multiplier at Tick N**:
```
E[multiplier | tick ≥ N] = AVERAGE(peak_multiplier WHERE duration_ticks ≥ N)
```

**Conditional Instarug Risk**:
```
P(instarug | current_tick < 10) = COUNT(instarugs) / COUNT(games ending < 10 ticks)
```

---

## 🗂️ DATA ORGANIZATION

### Raw Data Structure
```
rugs-data/
├── all-games.jsonl              # Master file (170+ games)
├── YYYY/MM/DD/                  # Date-organized files
│   └── HHh/                     # Hourly folders
│       ├── game-*.json          # Individual games
│       └── games-stream.jsonl   # Hourly stream
└── analytics/                   # Analysis outputs
```

### CSV Datasets
```
bayesian_study/
├── rugs_bayesian_data.csv       # Basic 7-field dataset
├── expanded_rugs_data.csv       # Extended 31-field dataset
└── player_integrated_data.csv   # Comprehensive 37-field dataset
```

---

## 📊 RECOMMENDED USAGE

### For Basic Analysis
Use `rugs_bayesian_data.csv` with core fields:
- duration_ticks, peak_multiplier, is_instarug, final_price

### For Technical Analysis
Use `expanded_rugs_data.csv` for:
- Timing metrics, price volatility, volume distribution

### For Comprehensive Analysis
Use `player_integrated_data.csv` for:
- Player behavior, profitability analysis, social dynamics

### For Raw Data Access
Process JSONL files directly for:
- Event-level analysis, custom metrics, real-time data

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-22  
**Total Unique Fields**: 50+ raw fields, 44 derived metrics