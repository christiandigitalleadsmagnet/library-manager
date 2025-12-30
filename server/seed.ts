import { storage } from "./storage";
import { hashPassword } from "./auth";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const adminPassword = await hashPassword("admin123");
    const admin = await storage.createUser({
      email: "admin@athenaeum.edu",
      password: adminPassword,
      name: "Dr. Eleanor Vance",
      role: "admin",
    });
    console.log("✅ Created admin user:", admin.email);

    // Create regular user
    const userPassword = await hashPassword("user123");
    const user = await storage.createUser({
      email: "user@athenaeum.edu",
      password: userPassword,
      name: "Sarah Connor",
      role: "user",
    });
    console.log("✅ Created user:", user.email);

    // Create books
    const booksData = [
      {
        title: "The Design of Everyday Things",
        author: "Don Norman",
        isbn: "978-0465050659",
        category: "Design",
        status: "available",
        totalCopies: 3,
        availableCopies: 3,
      },
      {
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        isbn: "978-0374533557",
        category: "Psychology",
        status: "available",
        totalCopies: 2,
        availableCopies: 2,
      },
      {
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "978-0132350884",
        category: "Technology",
        status: "available",
        totalCopies: 4,
        availableCopies: 4,
      },
      {
        title: "Dune",
        author: "Frank Herbert",
        isbn: "978-0441172719",
        category: "Sci-Fi",
        status: "available",
        totalCopies: 2,
        availableCopies: 2,
      },
      {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "978-0735211292",
        category: "Self-Help",
        status: "available",
        totalCopies: 5,
        availableCopies: 5,
      },
      {
        title: "Zero to One",
        author: "Peter Thiel",
        isbn: "978-0804139298",
        category: "Business",
        status: "available",
        totalCopies: 2,
        availableCopies: 2,
      },
      {
        title: "The Lean Startup",
        author: "Eric Ries",
        isbn: "978-0307887894",
        category: "Business",
        status: "available",
        totalCopies: 3,
        availableCopies: 3,
      },
      {
        title: "Sapiens",
        author: "Yuval Noah Harari",
        isbn: "978-0062316110",
        category: "History",
        status: "available",
        totalCopies: 3,
        availableCopies: 3,
      },
    ];

    for (const bookData of booksData) {
      const book = await storage.createBook(bookData);
      console.log("📚 Created book:", book.title);
    }

    console.log("\n✅ Database seeding completed!");
    console.log("\n📝 Test credentials:");
    console.log("   Admin: admin@athenaeum.edu / admin123");
    console.log("   User:  user@athenaeum.edu / user123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
