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
    hasJoinedBot: boolean;
  }
  interface Session {
    user: User & {
      id: string;
      role: string;
      stats: Stats | null;
      hasJoinedBot: boolean;
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
          hasJoinedBot: false,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      // Проверяем, существует ли пользователь и присоединился ли он к боту
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Если пользователь не существует или не присоединился к боту,
      // перенаправляем на страницу с инструкциями
      if (!dbUser || !dbUser.hasJoinedBot) {
        return "/join-bot";
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.id = discordProfile.id;
      }

      // Обновляем данные пользователя из базы при каждом обновлении токена
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, hasJoinedBot: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.hasJoinedBot = dbUser.hasJoinedBot;
        }
      } catch (error) {
        console.error("Error in jwt callback:", error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { stats: true },
          });

          if (!dbUser) {
            throw new Error("User not found");
          }

          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.stats = dbUser.stats;
          session.user.hasJoinedBot = dbUser.hasJoinedBot;
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

