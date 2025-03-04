import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { UsersService } from "../services/users/users.service";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.getCurrentUser(ctx.session.user.id);
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const usersService = new UsersService(ctx.prisma);
      return usersService.getUsers();
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      });
    }
  }),

  botList: protectedProcedure.query(async ({ ctx }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.getBotList();
  }),

  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.getUserById(input);
  }),

  getTop: publicProcedure.input(z.enum(['start', 'end'])).query(async ({ ctx, input }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.getTopUsers(input);
  }),

  getUserWithNeighbors: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.getUserWithNeighbors(input);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.enum(["ADMIN", "MODERATOR", "PLAYER"]).optional(),
        stats: z
          .object({
            rating: z.number(),
            wins: z.number(),
            losses: z.number(),
            draws: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usersService = new UsersService(ctx.prisma);
      return usersService.updateUser(input);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const usersService = new UsersService(ctx.prisma);
    return usersService.deleteUser(input);
  }),
});
