// types/express.d.ts
import type { Profile } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth — the verified Supabase identity from the access token.
      // id === auth.users.id === profiles.id.
      user?: { id: string; email: string | undefined };
      // Set by requireProfile — the app profile (carries the app role).
      profile?: Profile;
    }
  }
}

export {};
