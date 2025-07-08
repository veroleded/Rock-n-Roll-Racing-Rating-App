import { protectedProcedure, router } from "../trpc";

export const statsRouter = router({
  topPlayers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.stats.findMany({
      take: 10,
      orderBy: {
        rating: 'desc',
      },
      include: {
        user: true,
      },
    });
  }),

  overview: protectedProcedure.query(async ({ ctx }) => {
    const [totalMatches, totalPlayers, averageRating] = await Promise.all([
      ctx.prisma.match.count(),
      ctx.prisma.user.count({
        where: {
          role: 'PLAYER',
        },
      }),
      ctx.prisma.stats.aggregate({
        _avg: {
          rating: true,
        },
      }),
    ]);

    return {
      totalMatches,
      totalPlayers,
      averageRating: Math.round(averageRating._avg.rating || 1000),
    };
  }),
});
