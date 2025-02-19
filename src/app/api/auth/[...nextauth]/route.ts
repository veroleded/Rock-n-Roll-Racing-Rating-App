import { prisma } from "@/lib/prisma";
import { Stats } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import DiscordProvider from "next-auth/providers/discord";

interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
  verified: boolean;
  image_url?: string;
}

declare module "next-auth" {
  interface User {
    role: string;
    stats: Stats | null;
  }
  interface Session {
    user: User & {
      id: string;
      role: string;
      stats: Stats | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
      profile(profile: DiscordProfile) {
        if (profile.avatar === null) {
          profile.image_url =
            "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png";
        } else {
          profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
        }
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: profile.image_url,
          role: "PLAYER" as const,
          stats: null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.id = discordProfile.id;
        token.role = "PLAYER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        try {
          // Сначала ищем по email
          let dbUser = await prisma.user.findUnique({
            where: { email: session.user.email! },
            include: { stats: true },
          });

          // Если не нашли по email, ищем по discord ID
          if (!dbUser) {
            dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              include: { stats: true },
            });
          }

          // Если пользователь все еще не найден, создаем нового
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                id: token.id as string,
                name: session.user.name,
                email: session.user.email!,
                image: session.user.image,
                role: "PLAYER",
                stats: {
                  create: {
                    rating: 1000,
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                  },
                },
              },
              include: { stats: true },
            });
          }
          // Если нашли пользователя по email, но у него другой discord ID, обновляем его
          else if (dbUser.id !== token.id) {
            dbUser = await prisma.user.update({
              where: { email: session.user.email! },
              data: { id: token.id as string },
              include: { stats: true },
            });
          }

          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.stats = dbUser.stats;
        } catch (error) {
          console.error("Error in session callback:", error);
          throw error;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
