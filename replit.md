# Portfolio Website

## Overview

This is a Node.js-based portfolio website project configured for development and deployment on Replit. The project uses a modern web development stack with Vite for build tooling and includes PostgreSQL database support. The application is designed to run on port 5000 and is configured for automatic scaling deployment.

## System Architecture

### Frontend Architecture
- **Build Tool**: Vite for fast development and optimized production builds
- **Static Assets**: Served from `server/public` directory
- **Development Server**: Hot-reload enabled development environment

### Backend Architecture
- **Runtime**: Node.js 20
- **Server Framework**: Express.js (inferred from standard Node.js web application structure)
- **Port Configuration**: Application runs on port 5000 locally, mapped to port 80 externally

### Database Architecture
- **Database**: PostgreSQL 16
- **ORM**: Likely using Drizzle ORM (based on note about potential Postgres integration)
- **Connection**: Local PostgreSQL instance provided by Replit environment

## Key Components

### Build System
- **Development**: `npm run dev` - Starts development server with hot reload
- **Production Build**: `npm run build` - Creates optimized production bundle
- **Production Start**: `npm run start` - Serves production application

### File Structure
- `server/public/` - Static file serving directory (excluded from git)
- `dist/` - Build output directory (excluded from git)
- `node_modules/` - Dependencies (excluded from git)

### Configuration Files
- `.replit` - Replit environment configuration
- `vite.config.ts` - Vite build configuration (temporary files excluded)
- `.gitignore` - Git ignore patterns for build artifacts and dependencies

## Data Flow

1. **Development Flow**: 
   - Source files → Vite dev server → Hot reload → Browser
2. **Production Flow**: 
   - Source files → Vite build → Static assets → Express server → Client
3. **Database Flow**: 
   - Application → ORM/Query layer → PostgreSQL → Data persistence

## External Dependencies

### Development Dependencies
- **Vite**: Modern build tool for fast development and optimized builds
- **Node.js Modules**: Various npm packages for functionality

### Runtime Environment
- **Replit Modules**: 
  - `nodejs-20` - Node.js runtime environment
  - `web` - Web development capabilities
  - `postgresql-16` - Database server

### Deployment Platform
- **Replit Autoscale**: Automatic scaling deployment target
- **Port Mapping**: Internal port 5000 mapped to external port 80

## Deployment Strategy

### Development Deployment
- **Environment**: Replit development environment
- **Command**: `npm run dev`
- **Features**: Hot reload, instant updates, development optimizations

### Production Deployment
- **Build Process**: `npm run build` creates optimized bundle
- **Deployment Target**: Autoscale for automatic scaling based on traffic
- **Start Command**: `npm run start` for production server
- **Port Configuration**: External port 80 for web traffic

### Workflow Configuration
- **Parallel Execution**: Multiple tasks can run simultaneously
- **Automated Startup**: Workflow automatically starts application
- **Port Waiting**: System waits for port 5000 to be available before considering deployment successful

## Changelog
- June 16, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.