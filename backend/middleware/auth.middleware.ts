import { type Request, type Response, type NextFunction } from "express";
import { getAuthProfile } from "../utils/auth.ts";

/**
 * Verify the Supabase access token and attach the app profile to req.profile.
 * App role checks should read req.profile.role (NOT the token's Postgres role).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const profile = await getAuthProfile(req);
  if (!profile) {
    return res.status(401).json({ message: "Invalid token or no profile" });
  }
  req.profile = profile;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
