// types/express.d.ts
import type { Profile } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      // The app profile loaded after verifying the Supabase access token.
      profile?: Profile;
    }
  }
}

export {};
