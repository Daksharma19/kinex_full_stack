import { type Request } from "express";
import jwt from "jsonwebtoken";

export function getAuthUser(req: Request): { id: string; role: string } | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.split(" ")[1], process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
  } catch {
    return null;
  }
}