import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Настройки Prisma Client для продакшена
const prismaClientOptions = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  errorFormat: "pretty" as const,
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

// Обработка ошибок подключения
prisma.$on("error" as never, (e: Error) => {
  console.error("Prisma Client Error:", e);
});

// Graceful shutdown
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Закрытие соединений при завершении процесса
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
  
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
