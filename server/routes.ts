import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, generateToken, authenticateToken, requireRole, requireSuperAdmin } from "./auth";
import { insertUserSchema, insertBookSchema, updateBookSchema, insertBorrowTransactionSchema, insertSchoolSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import { parse } from "csv-parse/sync";

const upload = multer({ storage: multer.memoryStorage() });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  schoolSlug: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Public: Get all schools for login dropdown
  app.get("/api/schools", async (req, res) => {
    try {
      const schoolsList = await storage.getAllSchools();
      res.json(schoolsList.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Super Admin: Create new school/library
  app.post("/api/schools", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const validated = insertSchoolSchema.parse(req.body);
      
      const existingSchool = await storage.getSchoolBySlug(validated.slug);
      if (existingSchool) {
        return res.status(400).json({ message: "School with this slug already exists" });
      }

      const school = await storage.createSchool(validated);
      res.status(201).json(school);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  // Super Admin: Update school
  app.patch("/api/schools/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertSchoolSchema.partial().parse(req.body);
      
      if (updateData.slug) {
        const existingSchool = await storage.getSchoolBySlug(updateData.slug);
        if (existingSchool && existingSchool.id !== id) {
          return res.status(400).json({ message: "School with this slug already exists" });
        }
      }

      const school = await storage.updateSchool(id, updateData);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to update school" });
    }
  });

  // Super Admin: Get single school details
  app.get("/api/schools/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const school = await storage.getSchool(req.params.id);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch school" });
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { schoolSlug, ...userData } = req.body;
      const validated = insertUserSchema.parse(userData);
      
      let schoolId = null;
      if (schoolSlug) {
        const school = await storage.getSchoolBySlug(schoolSlug);
        if (!school) {
          return res.status(400).json({ message: "School not found" });
        }
        schoolId = school.id;
      }

      const existingUser = await storage.getUserByEmail(validated.email, schoolId || undefined);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered at this school" });
      }

      const hashedPassword = await hashPassword(validated.password);
      const user = await storage.createUser({
        ...validated,
        password: hashedPassword,
        schoolId,
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validated = loginSchema.parse(req.body);
      
      let schoolId: string | undefined;
      let user;
      
      if (validated.schoolSlug) {
        const school = await storage.getSchoolBySlug(validated.schoolSlug);
        if (!school) {
          return res.status(400).json({ message: "School not found" });
        }
        schoolId = school.id;
        user = await storage.getUserByEmail(validated.email, schoolId);
      } else {
        // Try to find super_admin user without school
        user = await storage.getUserByEmailNoSchool(validated.email);
        if (user && user.role !== "super_admin") {
          return res.status(400).json({ message: "School selection is required for non-super-admin users" });
        }
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePassword(validated.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      });

      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          schoolName: school?.name,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: school?.name,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/profile", authenticateToken, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }

      const user = await storage.updateUser(req.user!.userId, { name });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user!.userId, { password: hashedPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // User routes (admin only, scoped to school)
  app.get("/api/users", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId || undefined;
      const usersWithLoans = await storage.getAllUsersWithLoanCounts(schoolId);
      res.json(usersWithLoans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const schoolId = req.user!.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school to add members" });
      }
      
      const existingUser = await storage.getUserByEmail(validated.email, schoolId);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered at this school" });
      }

      const hashedPassword = await hashPassword(validated.password);
      const user = await storage.createUser({
        ...validated,
        password: hashedPassword,
        schoolId,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        createdAt: user.createdAt,
        activeLoans: 0,
        totalLoans: 0,
        status: "active",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // CSV Import - Members (scoped to school)
  app.post("/api/users/import", authenticateToken, requireRole("admin", "super_admin"), upload.single("file"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school to import members" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvContent = req.file.buffer.toString("utf-8");
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const results = {
        total: records.length,
        created: 0,
        skipped: 0,
        errors: [] as { row: number; email: string; error: string }[],
      };

      for (let i = 0; i < records.length; i++) {
        const record = records[i] as { name?: string; email?: string; password?: string; role?: string };
        try {
          const validated = insertUserSchema.parse({
            name: record.name,
            email: record.email,
            password: record.password || "changeme123",
            role: record.role || "user",
            schoolId,
          });

          const existingUser = await storage.getUserByEmail(validated.email, schoolId);
          if (existingUser) {
            results.skipped++;
            results.errors.push({ row: i + 2, email: record.email || "unknown", error: "Email already exists" });
            continue;
          }

          const hashedPassword = await hashPassword(validated.password);
          await storage.createUser({ ...validated, password: hashedPassword });
          results.created++;
        } catch (error) {
          results.errors.push({
            row: i + 2,
            email: record.email || "unknown",
            error: error instanceof z.ZodError ? fromZodError(error).toString() : "Invalid data",
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  // CSV Import - Books (scoped to school)
  app.post("/api/books/import", authenticateToken, requireRole("admin", "super_admin"), upload.single("file"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school to import books" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvContent = req.file.buffer.toString("utf-8");
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const results = {
        total: records.length,
        created: 0,
        skipped: 0,
        errors: [] as { row: number; isbn: string; error: string }[],
      };

      for (let i = 0; i < records.length; i++) {
        const record = records[i] as { title?: string; author?: string; isbn?: string; category?: string; totalCopies?: string };
        try {
          const totalCopies = parseInt(record.totalCopies || "1") || 1;
          const validated = insertBookSchema.parse({
            title: record.title,
            author: record.author,
            isbn: record.isbn,
            category: record.category || "General",
            status: "available",
            totalCopies: totalCopies,
            availableCopies: totalCopies,
            schoolId,
          });

          const existingBook = await storage.getBookByIsbn(validated.isbn, schoolId);
          if (existingBook) {
            results.skipped++;
            results.errors.push({ row: i + 2, isbn: record.isbn || "unknown", error: "ISBN already exists" });
            continue;
          }

          await storage.createBook(validated);
          results.created++;
        } catch (error) {
          results.errors.push({
            row: i + 2,
            isbn: record.isbn || "unknown",
            error: error instanceof z.ZodError ? fromZodError(error).toString() : "Invalid data",
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to import books" });
    }
  });

  // Book routes (scoped to school)
  app.get("/api/books", authenticateToken, async (req, res) => {
    try {
      const schoolId = req.user!.schoolId || undefined;
      const booksList = await storage.getAllBooks(schoolId);
      res.json(booksList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", authenticateToken, async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (req.user!.schoolId && book.schoolId !== req.user!.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.post("/api/books", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school to add books" });
      }
      
      const validated = insertBookSchema.parse({ ...req.body, schoolId });
      
      const existingBook = await storage.getBookByIsbn(validated.isbn, schoolId);
      if (existingBook) {
        return res.status(400).json({ message: "Book with this ISBN already exists" });
      }

      const book = await storage.createBook(validated);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  app.patch("/api/books/:id", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (req.user!.schoolId && book.schoolId !== req.user!.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validated = updateBookSchema.parse(req.body);
      const updatedBook = await storage.updateBook(req.params.id, validated);
      res.json(updatedBook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (req.user!.schoolId && book.schoolId !== req.user!.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json({ message: "Book deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // User search for admins
  app.get("/api/users/search", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const query = (req.query.query as string || "").toLowerCase().trim();
      const schoolId = req.user!.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school" });
      }
      
      const allUsers = await storage.getAllUsers(schoolId);
      const filtered = query 
        ? allUsers.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.email.toLowerCase().includes(query)
          )
        : allUsers;
      
      res.json(filtered.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get loans for specific user (admin only)
  app.get("/api/transactions/user-loans/:userId", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "Admin must be associated with a school" });
      }
      
      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (targetUser.schoolId !== schoolId) {
        return res.status(403).json({ message: "Cannot view loans for users from other schools" });
      }
      
      const transactions = await storage.getTransactionsByUserAndSchool(req.params.userId, schoolId);
      const schoolBooks = await storage.getAllBooks(schoolId);
      
      const loansWithBooks = transactions.map(t => {
        const book = schoolBooks.find(b => b.id === t.bookId);
        return {
          id: t.id,
          bookId: t.bookId,
          bookTitle: book?.title || "Unknown",
          bookAuthor: book?.author || "Unknown",
          bookIsbn: book?.isbn || "",
          borrowedAt: t.borrowedAt,
          dueDate: t.dueDate,
          returnedAt: t.returnedAt,
          status: t.status,
        };
      });
      
      res.json({
        user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
        loans: loansWithBooks,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user loans" });
    }
  });

  // Transaction routes (scoped to school)
  app.get("/api/transactions", authenticateToken, async (req, res) => {
    try {
      let transactions;
      if (req.user!.role === "admin") {
        const schoolId = req.user!.schoolId || undefined;
        transactions = await storage.getAllTransactions(schoolId);
      } else {
        transactions = await storage.getTransactionsByUserId(req.user!.userId);
      }
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/my-loans", authenticateToken, async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.json([]);
      }
      
      const transactions = await storage.getTransactionsByUserAndSchool(req.user!.userId, schoolId);
      const schoolBooks = await storage.getAllBooks(schoolId);
      
      const loansWithBooks = transactions.map(t => {
        const book = schoolBooks.find(b => b.id === t.bookId);
        return {
          id: t.id,
          bookId: t.bookId,
          bookTitle: book?.title || "Unknown",
          bookAuthor: book?.author || "Unknown",
          bookIsbn: book?.isbn || "",
          borrowedAt: t.borrowedAt,
          dueDate: t.dueDate,
          returnedAt: t.returnedAt,
          status: t.status,
        };
      });
      
      res.json(loansWithBooks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/transactions/overdue", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const schoolId = req.user!.schoolId || undefined;
      const overdueTransactions = await storage.getOverdueTransactions(schoolId);
      res.json(overdueTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue transactions" });
    }
  });

  app.post("/api/transactions/borrow", authenticateToken, async (req, res) => {
    try {
      const validated = insertBorrowTransactionSchema.parse(req.body);
      const schoolId = req.user!.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ message: "User must be associated with a school" });
      }
      
      const book = await storage.getBook(validated.bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (book.schoolId !== schoolId) {
        return res.status(403).json({ message: "This book belongs to a different school" });
      }

      if (book.availableCopies <= 0) {
        return res.status(400).json({ message: "No copies available" });
      }

      const activeLoans = await storage.getActiveTransactionsByUserId(req.user!.userId);
      if (activeLoans.length >= 5) {
        return res.status(400).json({ message: "Maximum loan limit reached (5 books)" });
      }

      const transaction = await storage.createTransaction({
        ...validated,
        userId: req.user!.userId,
        schoolId,
      });

      await storage.updateBook(validated.bookId, {
        availableCopies: book.availableCopies - 1,
        status: book.availableCopies - 1 === 0 ? "borrowed" : book.status,
      });

      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).toString() });
      }
      res.status(500).json({ message: "Failed to borrow book" });
    }
  });

  app.post("/api/transactions/:id/return", authenticateToken, async (req, res) => {
    try {
      const schoolId = req.user!.schoolId;
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (!schoolId || transaction.schoolId !== schoolId) {
        return res.status(403).json({ message: "This transaction belongs to a different school" });
      }

      const isOwner = transaction.userId === req.user!.userId;
      const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (transaction.status !== "active") {
        return res.status(400).json({ message: "Book already returned" });
      }

      const returned = await storage.returnBook(req.params.id);
      
      const book = await storage.getBook(transaction.bookId);
      if (book) {
        await storage.updateBook(transaction.bookId, {
          availableCopies: book.availableCopies + 1,
          status: "available",
        });
      }

      res.json(returned);
    } catch (error) {
      res.status(500).json({ message: "Failed to return book" });
    }
  });

  return httpServer;
}
