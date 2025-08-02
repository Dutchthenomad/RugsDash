# Rugs.fun Side Bet Prediction Engine

## Overview

This is a sophisticated side betting prediction system for the Rugs.fun gaming platform. The application combines real-time WebSocket data analysis with advanced mathematical prediction models to provide strategic betting insights. It features an adaptive prediction engine that analyzes game tick timing data to calculate optimal betting opportunities, complete with risk assessment and expected value calculations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript using a modern component-based architecture:
- **Component Structure**: Modular UI components using shadcn/ui with Radix UI primitives
- **State Management**: React hooks for local state, TanStack Query for server state management
- **Styling**: Tailwind CSS with a dark crypto-themed design system
- **Build System**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
Express.js server with TypeScript providing API endpoints and WebSocket management:
- **API Layer**: RESTful endpoints for prediction data storage and analytics retrieval
- **Storage Layer**: In-memory storage implementation with interfaces for future database integration
- **WebSocket Integration**: Dual WebSocket system - internal server WebSocket for client communication and external connection to rugs.fun backend
- **Data Processing**: Real-time game state processing and prediction calculations

### Prediction Engine
Advanced mathematical prediction system with multiple components:
- **Adaptive Models**: Real-time probability calculations based on empirical timing data analysis
- **Risk Assessment**: Multi-factor risk analysis considering timing variance, game phases, and historical patterns
- **Expected Value Calculations**: Mathematical optimization for betting decisions
- **Performance Tracking**: Accuracy monitoring with Brier scoring and confidence intervals

### Real-time Data Processing
Sophisticated WebSocket data handling architecture:
- **Connection Management**: Automatic reconnection with exponential backoff for rugs.fun backend
- **Data Validation**: Real-time game state validation and error handling
- **Timing Analysis**: Precision tick interval measurement and variance calculation
- **Prediction Updates**: Live probability recalculation with each game tick

### Database Schema Design
PostgreSQL schema optimized for prediction tracking and analytics:
- **Game States**: Real-time game data storage with price and timing information
- **Predictions**: Historical prediction storage with confidence scores and zones
- **Results Tracking**: Prediction outcome validation and performance metrics
- **User Management**: Basic user authentication and session handling

## External Dependencies

### Third-party Services
- **Rugs.fun Backend**: Primary data source via WebSocket connection at `backend.rugs.fun`
- **Neon Database**: PostgreSQL database hosting with serverless architecture

### Core Libraries
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL dialect
- **Socket.io**: WebSocket client for rugs.fun backend integration
- **Radix UI**: Accessible component primitives for complex UI interactions
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling with custom crypto theme
- **Vite**: Modern build tooling with hot module replacement
- **ESBuild**: Fast backend bundling for production deployment

### Mathematical Libraries
- **date-fns**: Date manipulation for timing calculations
- **class-variance-authority**: Component variant management
- **zod**: Runtime type validation for API data