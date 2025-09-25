# Xtream Codes Proxy HLS Dashboard

## Overview

This is a full-stack web application that provides a modern dashboard interface for managing and proxying Xtream Codes IPTV streams. The application acts as an intelligent HLS proxy server with advanced channel management capabilities, featuring a sleek React-based frontend and an Express.js backend with PostgreSQL data persistence.

The system connects to Xtream Codes servers, imports channel listings, provides content filtering (including adult content filtering), and serves proxied HLS streams with resilient error handling and reconnection logic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas for runtime type validation
- **Storage**: In-memory storage with interface for future database integration
- **Streaming**: Custom HLS proxy implementation with advanced error recovery

### Database Schema
- **channels**: Channel metadata (name, URL, group, logos, streaming info)
- **server_config**: Xtream Codes server connection details and settings
- **stream_logs**: Activity logging for streaming events and errors

### API Design
- RESTful endpoints for channel management (`/api/channels`)
- Configuration endpoints (`/api/config`)
- Statistics and monitoring (`/api/stats`, `/api/logs`)
- HLS streaming proxy (`/api/stream/:id.m3u8`)

### Key Features
- **Channel Import**: Automatic import from Xtream Codes APIs with category grouping
- **Content Filtering**: Adult content filtering with configurable keywords
- **Stream Proxying**: Advanced HLS proxy with reconnection logic and error handling
- **Real-time Monitoring**: Live activity logs and streaming statistics
- **Responsive Design**: Mobile-friendly interface with dark theme

### Error Handling & Resilience
- Proactive reconnection to parent manifests on segment failures
- Consecutive error counting to prevent infinite loops
- Configurable retry parameters and timeouts for real-time streaming
- Per-channel state tracking for intelligent failure recovery

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for Neon
- **drizzle-orm**: Type-safe database ORM and migrations
- **axios**: HTTP client for Xtream Codes API integration
- **express**: Web application framework
- **connect-pg-simple**: PostgreSQL session store

### UI Dependencies
- **@radix-ui/***: Headless UI component primitives
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Variant-based component styling
- **react-hook-form**: Performant form library
- **@hookform/resolvers**: Form validation resolvers

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production

### Database Configuration
- Uses PostgreSQL with Drizzle ORM
- Connection configured via `DATABASE_URL` environment variable
- Migration files generated in `./migrations` directory
- Schema defined in `./shared/schema.ts` for type sharing between client and server