import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type Request, type Response, type NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  schoolId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  
  next();
}
