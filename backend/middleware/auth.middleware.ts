import { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db.ts";
import { getAuthUser } from "../utils/auth.ts";

/**
 * Verify the Supabase access token (no DB hit) and attach the identity to
 * req.user = { id, email }. 401 if the token is missing/invalid/expired.
 *
 * Use ALONE on routes where the user may not have an app profile yet
 * (e.g. profile creation). Chain requireProfile after it for role-aware routes.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  req.user = authUser;
  next();
}

/**
 * Load the app profile for the authenticated user and attach it to req.profile.
 * MUST run after requireAuth. 404 if no profile exists yet.
 */
export async function requireProfile(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const profile = await prisma.profile.findUnique({ where: { id: req.user.id } });
  if (!profile) {
    return res.status(404).json({ message: "Profile not found — create one first" });
  }
  req.profile = profile;
  next();
}

/**
 * Restrict a route to the given app roles. MUST run after requireProfile.
 * 403 if req.profile.role is not in the allowed list.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
