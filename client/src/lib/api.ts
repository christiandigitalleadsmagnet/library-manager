import { toast } from "@/hooks/use-toast";

export interface School {
  id: string;
  name: string;
  slug: string;
  address?: string;
  contactEmail?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string | null;
  schoolName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  status: string;
  totalCopies: number;
  availableCopies: number;
  schoolId?: string | null;
  createdAt: string;
}

export interface BorrowTransaction {
  id: string;
  bookId: string;
  userId: string;
  schoolId?: string | null;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: string;
}

class ApiClient {
  private baseUrl = "/api";
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getSchools(): Promise<School[]> {
    const response = await fetch(`${this.baseUrl}/schools`);
    if (!response.ok) {
      throw new Error("Failed to fetch schools");
    }
    return response.json();
  }

  async login(email: string, password: string, schoolSlug?: string): Promise<AuthResponse> {
    const response = await this.fetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, schoolSlug }),
    });
    this.setToken(response.token);
    return response;
  }

  async register(email: string, password: string, name: string, role: string = "user", schoolSlug?: string): Promise<AuthResponse> {
    const response = await this.fetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role, schoolSlug }),
    });
    this.setToken(response.token);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.fetch<User>("/auth/me");
  }

  async getBooks(): Promise<Book[]> {
    return this.fetch<Book[]>("/books");
  }

  async getBook(id: string): Promise<Book> {
    return this.fetch<Book>(`/books/${id}`);
  }

  async createBook(book: Omit<Book, "id" | "createdAt" | "schoolId">): Promise<Book> {
    return this.fetch<Book>("/books", {
      method: "POST",
      body: JSON.stringify(book),
    });
  }

  async updateBook(id: string, updates: Partial<Book>): Promise<Book> {
    return this.fetch<Book>(`/books/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteBook(id: string): Promise<void> {
    return this.fetch<void>(`/books/${id}`, {
      method: "DELETE",
    });
  }

  async getTransactions(): Promise<BorrowTransaction[]> {
    return this.fetch<BorrowTransaction[]>("/transactions");
  }

  async borrowBook(bookId: string, dueDate: Date): Promise<BorrowTransaction> {
    return this.fetch<BorrowTransaction>("/transactions/borrow", {
      method: "POST",
      body: JSON.stringify({ bookId, dueDate: dueDate.toISOString(), status: "active" }),
    });
  }

  async returnBook(transactionId: string): Promise<BorrowTransaction> {
    return this.fetch<BorrowTransaction>(`/transactions/${transactionId}/return`, {
      method: "POST",
    });
  }

  async getOverdueTransactions(): Promise<BorrowTransaction[]> {
    return this.fetch<BorrowTransaction[]>("/transactions/overdue");
  }

  // Users (admin only)
  async getUsers(): Promise<UserWithLoans[]> {
    return this.fetch<UserWithLoans[]>("/users");
  }

  async createUser(data: { email: string; password: string; name: string; role: string }): Promise<UserWithLoans> {
    return this.fetch<UserWithLoans>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async importUsers(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("auth_token");
    const response = await fetch("/api/users/import", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Import failed");
    }
    return response.json();
  }

  async importBooks(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("auth_token");
    const response = await fetch("/api/books/import", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Import failed");
    }
    return response.json();
  }

  // Schools (super admin only)
  async createSchool(data: { name: string; slug: string; address?: string; contactEmail?: string }): Promise<School> {
    return this.fetch<School>("/schools", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSchool(id: string, data: { name?: string; slug?: string; address?: string; contactEmail?: string }): Promise<School> {
    return this.fetch<School>(`/schools/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateProfile(data: { name: string }): Promise<User> {
    return this.fetch<User>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.fetch<void>("/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getMyLoans(): Promise<LoanWithBook[]> {
    return this.fetch<LoanWithBook[]>("/transactions/my-loans");
  }

  async searchUsers(query: string): Promise<{ id: string; name: string; email: string; role: string }[]> {
    return this.fetch(`/users/search?query=${encodeURIComponent(query)}`);
  }

  async getUserLoans(userId: string): Promise<{ user: { id: string; name: string; email: string }; loans: LoanWithBook[] }> {
    return this.fetch(`/transactions/user-loans/${userId}`);
  }
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; email?: string; isbn?: string; error: string }[];
}

export interface LoanWithBook {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookIsbn: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
}

export interface UserWithLoans {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string | null;
  createdAt: string;
  activeLoans: number;
  totalLoans: number;
  status: string;
}

export const api = new ApiClient();
