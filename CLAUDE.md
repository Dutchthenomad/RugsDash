# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server (runs tsx server/index.ts)

# Build
npm run build           # Build frontend with Vite and bundle server with esbuild
npm run check           # Run TypeScript type checking

# Production
npm start               # Run production server from dist/

# Database
npm run db:push         # Push database schema changes with Drizzle
```

## Architecture Overview

### Dual WebSocket System
The application maintains two separate WebSocket connections:
1. **External**: Connects to `backend.rugs.fun` for live game data (`client/src/lib/websocketClient.ts`)
2. **Internal**: Server WebSocket at `/ws` for client-server communication (`server/routes.ts:129`)

### Data Flow
1. External WebSocket receives game updates from rugs.fun
2. Client processes updates through `AdaptivePredictionEngine` (`client/src/lib/predictionEngine.ts`)
3. Predictions are calculated using timing analysis and historical patterns
4. Q-Learning bot makes automated decisions (`server/qlearning/QLearningService.ts`)
5. Results stored via storage layer for analytics

### Key Integration Points

**WebSocket Message Format from rugs.fun:**
```typescript
{
  tickCount: number,      // or "tick"
  price: number,          // or "multiplier"
  active: boolean,        // or status === 'active'
  cooldownTimer: number,  // or "cooldown"
  gameId: string,         // or "id"
}
```

**Database Connection:**
- Requires `DATABASE_URL` environment variable
- Uses Neon PostgreSQL with WebSocket support
- Schema defined in `shared/schema.ts`

### Q-Learning Bot Architecture
- State representation: tick count, price level, volatility, timing reliability
- Actions: BET_SMALL, BET_MEDIUM, BET_LARGE, HOLD
- Training episodes tracked in database
- Real-time decision making based on Q-values

### Component Communication
- Dashboard (`pages/dashboard.tsx`) orchestrates all major components
- PlayerAssistanceCenter aggregates predictions, analytics, and bot recommendations
- PredictionEngine maintains rolling history of game data for analysis
- Components use TypeScript interfaces from `types/gameState.ts`

## Critical Considerations

### External Dependencies
- Application depends on `backend.rugs.fun` WebSocket for all game data
- No fallback if external service is unavailable
- WebSocket URL hardcoded in `websocketClient.ts:20`

### Current Limitations
- No authentication system implemented
- Storage layer uses in-memory implementation
- No input validation on API endpoints
- Missing error boundaries in several components

### Performance Bottlenecks
- Multiple state updates in `dashboard.tsx:handleGameStateUpdate` can cause re-renders
- No debouncing on rapid WebSocket updates
- Paper trading bot calculations run on every tick

## Development Notes

### Type Safety
- Avoid using `any` types - several exist in routes.ts and QLearningService.ts
- Game state transformations in websocketClient.ts handle multiple data formats

### Environment Setup
- Create `.env` file with `DATABASE_URL` for database connection
- Default port is 5000 (specified in `server/index.ts:63`)
- Development uses NODE_ENV=development for Vite integration