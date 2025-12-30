import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  schoolId: varchar("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("users_email_school_unique").on(table.email, table.schoolId),
]);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("available"),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(1),
  schoolId: varchar("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("books_isbn_school_unique").on(table.isbn, table.schoolId),
]);

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
});

export const updateBookSchema = insertBookSchema.partial();

export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type Book = typeof books.$inferSelect;

export const borrowTransactions = pgTable("borrow_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  schoolId: varchar("school_id").references(() => schools.id),
  borrowedAt: timestamp("borrowed_at").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  returnedAt: timestamp("returned_at"),
  status: text("status").notNull().default("active"),
});

export const insertBorrowTransactionSchema = createInsertSchema(borrowTransactions).omit({
  id: true,
  borrowedAt: true,
  userId: true,
}).extend({
  dueDate: z.coerce.date(),
});

export type InsertBorrowTransaction = z.infer<typeof insertBorrowTransactionSchema>;
export type BorrowTransaction = typeof borrowTransactions.$inferSelect;
