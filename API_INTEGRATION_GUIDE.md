# Athenaeum Library Management API - Integration Guide

This document provides all the information needed to integrate the Athenaeum Library Management System with external platforms such as school management systems.

---

## Base URL

Once deployed, the API will be available at:

```
Production: https://[your-app-url]/api
Development: http://localhost:5000/api
```

> **Note for Platform Administrators**: Replace `[your-app-url]` with the actual deployed domain. If using Replit Deployments, the URL will follow the pattern: `https://your-app-name.replit.app/api`

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication.

### Obtaining a Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### Using the Token

Include the token in the `Authorization` header for all protected endpoints:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration:** 7 days

---

## User Roles

| Role    | Description                                      |
|---------|--------------------------------------------------|
| `user`  | Regular library member - can borrow/return books |
| `admin` | Full access - can manage books and users         |

---

## API Endpoints

### Authentication

#### Register New User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "student@school.edu",
  "password": "securePassword123",
  "name": "Student Name",
  "role": "user"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "student@school.edu",
    "name": "Student Name",
    "role": "user"
  }
}
```

#### Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "student@school.edu",
  "password": "securePassword123"
}
```

#### Get Current User (Protected)
```
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Books

#### Get All Books
```
GET /api/books
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "category": "Technology",
    "status": "available",
    "totalCopies": 3,
    "availableCopies": 2,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Get Book by ID
```
GET /api/books/:id
```

#### Create Book (Admin Only)
```
POST /api/books
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "978-1234567890",
  "category": "Category",
  "status": "available",
  "totalCopies": 1,
  "availableCopies": 1
}
```

#### Update Book (Admin Only)
```
PATCH /api/books/:id
Authorization: Bearer <admin-token>
```

#### Delete Book (Admin Only)
```
DELETE /api/books/:id
Authorization: Bearer <admin-token>
```

---

### Borrow Transactions

#### Get Transactions
```
GET /api/transactions
Authorization: Bearer <token>
```

**Note:** 
- Regular users see only their own transactions
- Admins see all transactions

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "bookId": "book-uuid",
    "userId": "user-uuid",
    "borrowedAt": "2024-01-15T10:30:00.000Z",
    "dueDate": "2024-01-29T10:30:00.000Z",
    "returnedAt": null,
    "status": "active"
  }
]
```

#### Borrow a Book
```
POST /api/transactions/borrow
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "bookId": "book-uuid-here",
  "dueDate": "2024-01-29T10:30:00.000Z",
  "status": "active"
}
```

**Response:** `201 Created`
```json
{
  "id": "transaction-uuid",
  "bookId": "book-uuid",
  "userId": "user-uuid",
  "borrowedAt": "2024-01-15T10:30:00.000Z",
  "dueDate": "2024-01-29T10:30:00.000Z",
  "status": "active"
}
```

**Business Rules:**
- Maximum 5 active loans per user
- Book must have available copies

#### Return a Book
```
POST /api/transactions/:id/return
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "transaction-uuid",
  "bookId": "book-uuid",
  "userId": "user-uuid",
  "borrowedAt": "2024-01-15T10:30:00.000Z",
  "dueDate": "2024-01-29T10:30:00.000Z",
  "returnedAt": "2024-01-20T14:00:00.000Z",
  "status": "returned"
}
```

#### Get Overdue Transactions (Admin Only)
```
GET /api/transactions/overdue
Authorization: Bearer <admin-token>
```

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description here"
}
```

### Common HTTP Status Codes

| Code | Meaning                                    |
|------|--------------------------------------------|
| 200  | Success                                    |
| 201  | Created successfully                       |
| 400  | Bad request (validation error)             |
| 401  | Authentication required                    |
| 403  | Forbidden (insufficient permissions)       |
| 404  | Resource not found                         |
| 500  | Internal server error                      |

---

## Integration Patterns

### Single Sign-On (SSO) Integration

If NexKool uses SSO, you can integrate by:

1. **Create users programmatically** when they authenticate via NexKool
2. **Use the `/api/auth/register` endpoint** to create matching accounts
3. **Store the returned JWT token** in the school management platform's session

**Example Flow:**
```
1. User logs into NexKool
2. NexKool calls Athenaeum /api/auth/register (if new user) or /api/auth/login
3. Athenaeum returns JWT token
4. NexKool stores token and includes it in subsequent requests
5. User accesses library features seamlessly
```

### Embedding via iFrame

If embedding the library UI inside NexKool:

```html
<iframe 
  src="https://[your-app-url]/catalog" 
  width="100%" 
  height="800px"
  frameborder="0"
></iframe>
```

**Note:** For iFrame integration, you may need to pass the authentication token via URL or postMessage.

### Webhook Integration (Future)

For event-driven integration (e.g., notifications when books are due), webhook endpoints can be added. Contact the development team to discuss requirements.

---

## Data Models

### User
```typescript
{
  id: string;          // UUID
  email: string;       // Unique email address
  name: string;        // Display name
  role: "user" | "admin";
  createdAt: Date;
}
```

### Book
```typescript
{
  id: string;          // UUID
  title: string;
  author: string;
  isbn: string;        // Unique ISBN
  category: string;
  status: "available" | "borrowed";
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
}
```

### BorrowTransaction
```typescript
{
  id: string;          // UUID
  bookId: string;      // Reference to Book
  userId: string;      // Reference to User
  borrowedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  status: "active" | "returned";
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. For production deployments with high traffic, consider implementing rate limiting at the API gateway level.

---

## CORS Configuration

The API is configured to accept requests from any origin in development. For production, you may need to whitelist specific domains:

**Contact the development team** to add NexKool's domain to the CORS allowlist.

---

## Test Credentials

For integration testing, use these accounts:

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@athenaeum.edu    | admin123   |
| User  | user@athenaeum.edu     | user123    |

---

## Support & Contact

For integration support or to request additional API features:

- **Technical Questions**: [Your contact email]
- **API Issues**: [GitHub repository or issue tracker]
- **Documentation Updates**: Submit a request with the specific integration requirements

---

## Version

**API Version:** 1.0.0  
**Last Updated:** December 2024
