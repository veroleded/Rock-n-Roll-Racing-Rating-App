import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      stats: {
        rating: number;
        gamesPlayed: number;
        wins: number;
        losses: number;
        draws: number;
      } | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    stats: {
      rating: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    discordId: string;
    nickname: string;
    role: Role;
    accessToken: string;
  }
}
