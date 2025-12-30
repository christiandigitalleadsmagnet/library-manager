# Athenaeum - Library Management System

## Overview

Athenaeum is a multi-tenant full-stack library management application that enables users to browse, borrow, and return books while providing administrators with comprehensive management tools. The system features multi-tenancy with school-based data isolation, role-based access control (super_admin/admin/user), real-time inventory tracking, and automated due date management with a 14-day borrowing period.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**
- React 19 with TypeScript for type-safe component development
- Wouter for client-side routing (lightweight alternative to React Router)
- Component-based architecture with reusable UI elements

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and automatic refetching
- Custom auth context (AuthProvider) for managing authentication state across the application
- Local storage for JWT token persistence

**Styling & UI Components**
- Tailwind CSS v4 with custom theme configuration for academic/library aesthetic
- shadcn/ui component library providing pre-built, accessible components
- Custom design tokens defined in CSS variables for consistent theming
- Radix UI primitives for accessible, unstyled component foundations

**Form Handling**
- React Hook Form for performant form state management
- Zod for runtime schema validation and type inference
- @hookform/resolvers for integrating Zod with React Hook Form

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for type-safe API development
- RESTful API design with resource-based endpoints
- Middleware-based request processing (JSON parsing, authentication, logging)

**Authentication & Authorization**
- JWT (JSON Web Tokens) for stateless authentication
- bcrypt for password hashing with configurable salt rounds
- Token-based authentication middleware protecting routes
- Role-based access control with three roles:
  - super_admin: Can manage all schools/libraries, create new libraries
  - admin: Can manage books/users within their assigned school
  - user: Can borrow and return books within their school

**Database Layer**
- PostgreSQL as the relational database
- Drizzle ORM for type-safe database queries and schema management
- Schema-first approach with TypeScript types inferred from database schema
- Migration support through Drizzle Kit

**API Structure**
- `/api/auth/*` - Authentication endpoints (register, login)
- `/api/schools/*` - School/library management (super_admin only)
- `/api/books/*` - Book catalog management (CRUD operations)
- `/api/transactions/*` - Borrowing transaction management
- `/api/users/*` - User management (admin only)

### Data Models

**Users Table**
- UUID primary key with auto-generation
- Email (unique), hashed password, name, and role fields
- Role-based permissions (admin/user)
- Timestamp tracking for account creation

**Books Table**
- UUID primary key with auto-generation
- Title, author, ISBN (unique), and category fields
- Status tracking (available/borrowed)
- Copy management (totalCopies, availableCopies)
- Inventory control through available copy counters

**Borrow Transactions Table**
- UUID primary key with auto-generation
- Foreign key relationships to books and users
- Temporal tracking (borrowedAt, dueDate, returnedAt)
- Status field for transaction state (active/returned)

### Build & Development

**Development Mode**
- Vite dev server for fast HMR (Hot Module Replacement)
- Separate backend server running with tsx (TypeScript execution)
- Concurrent development of frontend and backend

**Production Build**
- esbuild for bundling server code with selective dependency bundling
- Vite for optimized client build with code splitting
- Static file serving from Express in production
- Whitelist approach for bundling critical dependencies to improve cold start times

**Development Tools**
- Replit-specific plugins for enhanced development experience (error overlay, cartographer, dev banner)
- Custom Vite plugin for meta image management (OpenGraph/Twitter cards)
- TypeScript strict mode for type safety

## External Dependencies

### Core Runtime
- Node.js 20+ runtime environment
- PostgreSQL database (connection via DATABASE_URL environment variable)

### Authentication & Security
- JWT_SECRET environment variable for token signing
- bcrypt for password hashing (salt rounds: 10)

### UI Component Libraries
- Radix UI component primitives for accessibility
- Lucide React for iconography
- Google Fonts (Inter, Libre Baskerville) for typography

### Development Services
- Replit deployment platform features
- Vite development server with HMR

### Database Connection
- PostgreSQL client via pg package
- Connection string from DATABASE_URL environment variable
- Drizzle ORM for query building and type safety

### Build Tools
- esbuild for server bundling
- Vite for client bundling and development
- Tailwind CSS for styling compilation