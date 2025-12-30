# Athenaeum - Library Management System

A modern, full-stack library management application built with React, Node.js/Express, PostgreSQL, and JWT authentication.

## Features

### For Users
- **Browse Catalog**: Search and filter books by title, author, or ISBN
- **Borrow Books**: Borrow available books with automatic due date (14 days)
- **Return Books**: Return borrowed books
- **View Activity**: Track your borrowing history

### For Administrators
- **Book Management**: Full CRUD operations for book inventory
- **User Management**: View and manage library members
- **Dashboard**: Real-time statistics and analytics
- **Overdue Tracking**: Monitor and manage overdue returns

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching and caching
- **Tailwind CSS v4** for styling
- **shadcn/ui** component library
- **React Hook Form** + Zod for form validation

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Drizzle ORM** for type-safe database queries
- **JWT** for authentication
- **bcrypt** for password hashing

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

4. Push database schema:
```bash
npm run db:push
```

5. Seed the database with sample data:
```bash
tsx server/seed.ts
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Test Credentials

### Administrator
- Email: `admin@athenaeum.edu`
- Password: `admin123`

### Regular User
- Email: `user@athenaeum.edu`
- Password: `user123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current user info (requires auth)

### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create new book (admin only)
- `PATCH /api/books/:id` - Update book (admin only)
- `DELETE /api/books/:id` - Delete book (admin only)

### Transactions
- `GET /api/transactions` - Get transactions (user: own transactions, admin: all)
- `GET /api/transactions/overdue` - Get overdue transactions (admin only)
- `POST /api/transactions/borrow` - Borrow a book
- `POST /api/transactions/:id/return` - Return a borrowed book

## Database Schema

### Users
- id (UUID, primary key)
- email (unique)
- password (hashed)
- name
- role (user/admin)
- createdAt

### Books
- id (UUID, primary key)
- title
- author
- isbn (unique)
- category
- status (available/borrowed)
- totalCopies
- availableCopies
- createdAt

### Borrow Transactions
- id (UUID, primary key)
- bookId (foreign key → books)
- userId (foreign key → users)
- borrowedAt
- dueDate
- returnedAt (nullable)
- status (active/returned)

## Deployment

### Database
1. Create a PostgreSQL database (e.g., on AWS RDS, Neon, or Supabase)
2. Set the `DATABASE_URL` environment variable
3. Run `npm run db:push` to create tables

### Application
1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

### Environment Variables (Production)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong secret key for JWT signing
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Set to `production`

## Architecture

### Frontend Structure
```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── layout.tsx    # Main application layout
│   │   └── ui/          # shadcn/ui components
│   ├── pages/           # Route components
│   ├── lib/             # Utilities and API client
│   │   ├── api.ts       # Type-safe API client
│   │   ├── auth.tsx     # Auth context provider
│   │   └── utils.ts     # Helper functions
│   └── App.tsx          # Root component with routing
```

### Backend Structure
```
server/
├── index.ts       # Express app setup
├── routes.ts      # API route handlers
├── storage.ts     # Database operations (Drizzle)
├── auth.ts        # JWT and bcrypt utilities
└── seed.ts        # Database seeding script

shared/
└── schema.ts      # Shared types and Drizzle schema
```

## Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT-based authentication with 7-day expiration
- ✅ Role-based access control (user/admin)
- ✅ Input validation with Zod schemas
- ✅ Protected API routes with authentication middleware
- ✅ SQL injection protection via Drizzle ORM

## Future Enhancements

- [ ] Email notifications for due dates and overdue books
- [ ] Advanced search with filters (category, availability, etc.)
- [ ] Book reviews and ratings
- [ ] Reservation system for unavailable books
- [ ] Fine calculation for overdue returns
- [ ] Export reports (PDF/CSV)
- [ ] Multi-language support
- [ ] Dark mode toggle

## License

MIT
