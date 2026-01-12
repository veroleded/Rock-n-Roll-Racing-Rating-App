import { prisma } from '@/lib/prisma';
import { Stats } from '@prisma/client';
import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
  verified: boolean;
  image_url?: string;
}

declare module 'next-auth' {
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
          scope: 'identify email guilds',
        },
      },
      profile(profile: DiscordProfile) {
        if (profile.avatar === null) {
          profile.image_url = 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';
        } else {
          profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
        }
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: profile.image_url,
          role: 'PLAYER' as const,
          stats: null,
          hasJoinedBot: false,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      // ВАЖНО: не даём ошибкам БД "протекать" в redirect header (это ломает Headers.set)
      // и не роняем auth-route, если Postgres временно недоступен (recovery mode).
      let dbUser: { hasJoinedBot: boolean } | null = null;
      try {
        dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { hasJoinedBot: true },
        });
      } catch (error) {
        console.error('Error in signIn callback (DB unavailable?):', error);
        // Безопаснее отказать во входе, чем делать редирект с "сырым" текстом ошибки.
        return false;
      }

      if (!dbUser || !dbUser.hasJoinedBot) {
        return '/join-bot';
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.id = discordProfile.id;
      }

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
        console.error('Error in jwt callback:', error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Базовые поля берём из JWT, чтобы сессия не падала при проблемах с БД.
        const tokenId = token.id as string | undefined;
        session.user.id = tokenId ?? session.user.id;
        session.user.role = (token.role as string | undefined) ?? session.user.role ?? 'PLAYER';
        session.user.hasJoinedBot = Boolean(
          (token as unknown as { hasJoinedBot?: boolean }).hasJoinedBot ?? session.user.hasJoinedBot ?? false,
        );
        session.user.stats = null;

        // Статы подтягиваем из БД best-effort (не роняем auth, если Postgres в recovery mode).
        if (tokenId) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: tokenId },
              include: { stats: true },
            });

            if (dbUser) {
              session.user.id = dbUser.id;
              session.user.role = dbUser.role;
              session.user.stats = dbUser.stats;
              session.user.hasJoinedBot = dbUser.hasJoinedBot;
            }
          } catch (error) {
            console.error('Error in session callback (DB unavailable?):', error);
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};
