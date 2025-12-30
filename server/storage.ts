import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  type User, 
  type InsertUser, 
  type Book, 
  type InsertBook, 
  type UpdateBook,
  type BorrowTransaction,
  type InsertBorrowTransaction,
  type School,
  type InsertSchool,
  users, 
  books, 
  borrowTransactions,
  schools
} from "@shared/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();
const db = drizzle(client);

export interface UserWithLoans {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
  createdAt: Date;
  activeLoans: number;
  totalLoans: number;
  status: string;
}

export interface IStorage {
  // School operations
  getAllSchools(): Promise<School[]>;
  getSchool(id: string): Promise<School | undefined>;
  getSchoolBySlug(slug: string): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: string, school: Partial<InsertSchool>): Promise<School | undefined>;
  deleteSchool(id: string): Promise<boolean>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string, schoolId?: string): Promise<User | undefined>;
  getUserByEmailNoSchool(email: string): Promise<User | undefined>;
  getAllUsers(schoolId?: string): Promise<User[]>;
  getAllUsersWithLoanCounts(schoolId?: string): Promise<UserWithLoans[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<{ name: string; password: string }>): Promise<User | undefined>;
  
  // Book operations
  getAllBooks(schoolId?: string): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  getBookByIsbn(isbn: string, schoolId?: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: UpdateBook): Promise<Book | undefined>;
  deleteBook(id: string): Promise<boolean>;
  
  // Borrow transaction operations
  getAllTransactions(schoolId?: string): Promise<BorrowTransaction[]>;
  getTransactionsByUserId(userId: string): Promise<BorrowTransaction[]>;
  getTransactionsByUserAndSchool(userId: string, schoolId: string): Promise<BorrowTransaction[]>;
  getActiveTransactionsByUserId(userId: string): Promise<BorrowTransaction[]>;
  getTransactionById(id: string): Promise<BorrowTransaction | undefined>;
  createTransaction(transaction: InsertBorrowTransaction & { userId: string }): Promise<BorrowTransaction>;
  returnBook(transactionId: string): Promise<BorrowTransaction | undefined>;
  getOverdueTransactions(schoolId?: string): Promise<BorrowTransaction[]>;
}

export class DbStorage implements IStorage {
  // School operations
  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getSchool(id: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return result[0];
  }

  async getSchoolBySlug(slug: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
    return result[0];
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const result = await db.insert(schools).values(school).returning();
    return result[0];
  }

  async updateSchool(id: string, schoolUpdate: Partial<InsertSchool>): Promise<School | undefined> {
    const result = await db
      .update(schools)
      .set(schoolUpdate)
      .where(eq(schools.id, id))
      .returning();
    return result[0];
  }

  async deleteSchool(id: string): Promise<boolean> {
    const result = await db.delete(schools).where(eq(schools.id, id)).returning();
    return result.length > 0;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string, schoolId?: string): Promise<User | undefined> {
    if (schoolId) {
      const result = await db.select().from(users)
        .where(and(eq(users.email, email), eq(users.schoolId, schoolId)))
        .limit(1);
      return result[0];
    }
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByEmailNoSchool(email: string): Promise<User | undefined> {
    const result = await db.select().from(users)
      .where(and(eq(users.email, email), isNull(users.schoolId)))
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<{ name: string; password: string }>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(schoolId?: string): Promise<User[]> {
    if (schoolId) {
      return await db.select().from(users).where(eq(users.schoolId, schoolId));
    }
    return await db.select().from(users);
  }

  async getAllUsersWithLoanCounts(schoolId?: string): Promise<UserWithLoans[]> {
    const schoolFilter = schoolId ? sql`AND u.school_id = ${schoolId}` : sql``;
    const result = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.school_id as "schoolId",
        u.created_at as "createdAt",
        COALESCE(COUNT(CASE WHEN bt.status = 'active' THEN 1 END), 0)::int as "activeLoans",
        COALESCE(COUNT(bt.id), 0)::int as "totalLoans",
        CASE 
          WHEN COUNT(CASE WHEN bt.status = 'active' AND bt.due_date < NOW() THEN 1 END) > 0 THEN 'overdue'
          WHEN COUNT(CASE WHEN bt.status = 'active' THEN 1 END) > 0 THEN 'active'
          ELSE 'active'
        END as status
      FROM users u
      LEFT JOIN borrow_transactions bt ON u.id = bt.user_id
      WHERE 1=1 ${schoolFilter}
      GROUP BY u.id, u.email, u.name, u.role, u.school_id, u.created_at
      ORDER BY u.created_at DESC
    `);
    return result.rows as unknown as UserWithLoans[];
  }

  // Book operations
  async getAllBooks(schoolId?: string): Promise<Book[]> {
    if (schoolId) {
      return await db.select().from(books).where(eq(books.schoolId, schoolId));
    }
    return await db.select().from(books);
  }

  async getBook(id: string): Promise<Book | undefined> {
    const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
    return result[0];
  }

  async getBookByIsbn(isbn: string, schoolId?: string): Promise<Book | undefined> {
    if (schoolId) {
      const result = await db.select().from(books)
        .where(and(eq(books.isbn, isbn), eq(books.schoolId, schoolId)))
        .limit(1);
      return result[0];
    }
    const result = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1);
    return result[0];
  }

  async createBook(book: InsertBook): Promise<Book> {
    const result = await db.insert(books).values(book).returning();
    return result[0];
  }

  async updateBook(id: string, bookUpdate: UpdateBook): Promise<Book | undefined> {
    const result = await db
      .update(books)
      .set(bookUpdate)
      .where(eq(books.id, id))
      .returning();
    return result[0];
  }

  async deleteBook(id: string): Promise<boolean> {
    const result = await db.delete(books).where(eq(books.id, id)).returning();
    return result.length > 0;
  }

  // Borrow transaction operations
  async getAllTransactions(schoolId?: string): Promise<BorrowTransaction[]> {
    if (schoolId) {
      return await db.select().from(borrowTransactions).where(eq(borrowTransactions.schoolId, schoolId));
    }
    return await db.select().from(borrowTransactions);
  }

  async getTransactionsByUserId(userId: string): Promise<BorrowTransaction[]> {
    return await db
      .select()
      .from(borrowTransactions)
      .where(eq(borrowTransactions.userId, userId));
  }

  async getTransactionsByUserAndSchool(userId: string, schoolId: string): Promise<BorrowTransaction[]> {
    return await db
      .select()
      .from(borrowTransactions)
      .where(and(eq(borrowTransactions.userId, userId), eq(borrowTransactions.schoolId, schoolId)));
  }

  async getActiveTransactionsByUserId(userId: string): Promise<BorrowTransaction[]> {
    return await db
      .select()
      .from(borrowTransactions)
      .where(
        and(
          eq(borrowTransactions.userId, userId),
          eq(borrowTransactions.status, "active")
        )
      );
  }

  async getTransactionById(id: string): Promise<BorrowTransaction | undefined> {
    const result = await db
      .select()
      .from(borrowTransactions)
      .where(eq(borrowTransactions.id, id))
      .limit(1);
    return result[0];
  }

  async createTransaction(transaction: InsertBorrowTransaction & { userId: string }): Promise<BorrowTransaction> {
    const result = await db.insert(borrowTransactions).values(transaction).returning();
    return result[0];
  }

  async returnBook(transactionId: string): Promise<BorrowTransaction | undefined> {
    const result = await db
      .update(borrowTransactions)
      .set({
        returnedAt: new Date(),
        status: "returned",
      })
      .where(eq(borrowTransactions.id, transactionId))
      .returning();
    return result[0];
  }

  async getOverdueTransactions(schoolId?: string): Promise<BorrowTransaction[]> {
    if (schoolId) {
      return await db
        .select()
        .from(borrowTransactions)
        .where(
          and(
            eq(borrowTransactions.status, "active"),
            eq(borrowTransactions.schoolId, schoolId),
            sql`${borrowTransactions.dueDate} < NOW()`
          )
        );
    }
    return await db
      .select()
      .from(borrowTransactions)
      .where(
        and(
          eq(borrowTransactions.status, "active"),
          sql`${borrowTransactions.dueDate} < NOW()`
        )
      );
  }
}

export const storage = new DbStorage();
