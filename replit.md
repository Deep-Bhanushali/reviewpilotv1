# Online Reviewer System

## Overview

The Online Reviewer System is a comprehensive full-stack web application that facilitates a review-based earning model. Users purchase products through mediators, submit reviews on e-commerce platforms, and receive refunds. The system tracks orders, manages mediator relationships, handles multiple platform accounts, and provides notifications for order status updates.

The application features a React frontend with TypeScript, shadcn/ui components, and TailwindCSS for styling. The backend uses Express.js with TypeScript and connects to a PostgreSQL database via Drizzle ORM. Authentication is handled through Replit's OIDC system, and the application supports multiple Indian e-commerce platforms including Amazon, Flipkart, Myntra, and others.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with CSS custom properties for theming
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using ES modules
- **Language**: TypeScript with strict type checking enabled
- **API Pattern**: RESTful API design with Express route handlers
- **Error Handling**: Global error middleware with structured error responses
- **Logging**: Custom request/response logging middleware for API routes

### Authentication & Session Management
- **Provider**: Replit OIDC authentication system
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **Strategy**: Passport.js with OpenID Connect strategy
- **Security**: HTTP-only cookies with secure flags for production

### Data Storage Solutions
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Management**: Centralized schema definitions in shared directory with Zod integration
- **Currency Handling**: Integer-based storage in paise to avoid floating-point precision issues

### Database Schema Design
- **Users**: OIDC-compatible user profiles with email and metadata
- **User Settings**: Configuration for calendar integration with Google OAuth tokens
- **Mediators**: Third-party dealers with WhatsApp contact information
- **Accounts**: E-commerce platform account credentials and details
- **Orders**: Complete order lifecycle tracking with status management and calendar event IDs
- **Activity Logs**: Comprehensive audit trail for all order changes and system actions
- **Notifications**: System-generated alerts with type classification
- **Sessions**: Secure session persistence for authentication state

### Business Logic Architecture
- **Order Status Flow**: Eight-stage status progression from "Ordered" to "Refunded"
- **Multi-Platform Support**: Eight major Indian e-commerce platforms supported
- **Currency System**: INR-based with paise storage and formatted display
- **Notification System**: Automated notifications for order status changes and deadlines
- **Activity Logging**: Automatic tracking of all order changes (creation, status updates, date modifications) with enum-based activity types
- **Smart Notifications**: Intelligent dashboard card that analyzes orders and highlights those needing immediate attention, upcoming deadlines, or overdue tasks
- **Calendar Integration**: Google Calendar sync for automatic deadline management
  - Creates events for delivery dates, review deadlines, and refund form submissions
  - Updates existing events when order dates change (no duplicates)
  - Deletes calendar events when orders are deleted or dates are cleared
  - Stores calendar event IDs in orders table for proper lifecycle management

### Development & Deployment
- **Module System**: ES modules throughout with proper import/export patterns
- **Build Process**: Vite for frontend bundling, esbuild for server compilation
- **Development Server**: Hot module replacement with Vite middleware integration
- **Path Aliases**: Centralized import paths using TypeScript path mapping

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React routing
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers

### UI Component Libraries
- **@radix-ui/***: Comprehensive set of accessible UI primitives for modals, dropdowns, forms, and navigation
- **shadcn/ui**: Pre-built component library based on Radix UI
- **lucide-react**: Icon library for consistent iconography

### Database & Backend Services
- **@neondatabase/serverless**: PostgreSQL serverless database connectivity
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **drizzle-kit**: Database migration and schema management tools
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Authentication Infrastructure
- **passport**: Authentication middleware framework
- **openid-client**: OpenID Connect client implementation
- **express-session**: Session management middleware
- **google-auth-library**: Google OAuth2 authentication for calendar integration
- **googleapis**: Google Calendar API client for event management

### Styling & Development Tools
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe utility for component variants
- **date-fns**: Date manipulation and formatting utilities
- **zod**: Runtime type validation and schema definition

### Development Environment
- **@replit/vite-plugin-***: Replit-specific development tooling and error overlay
- **typescript**: Static type checking and compilation
- **vite**: Frontend build tool and development server
- **esbuild**: Fast bundler for server-side code