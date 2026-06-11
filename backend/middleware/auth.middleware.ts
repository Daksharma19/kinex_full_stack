import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  id: string;
  role: string;
}

export function requireAuth(req:Request, res:Response, next:NextFunction){
    const header = req.headers.authorization;
    if(!header?.startsWith("Bearer ")){
        return res.status(401).json({
            messages:"No token provided"
        });
    }
    const token = header.split(" ")[1];
    try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    const payload = jwt.verify(token, secret) as unknown as AuthPayload;

    req.user = payload;   // { id, role } now available to all downstream handlers
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}