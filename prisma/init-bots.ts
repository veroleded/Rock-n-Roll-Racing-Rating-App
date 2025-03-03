import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Начинаем инициализацию ботов...");
  

  const botIds: string[] = [
    "bot_alexander",
    "bot_vladimir",
    "bot_dmitry",
    "bot_mikhail",
    "bot_ivan",
    "bot_sergey"
  ];

    await Promise.all(
      botIds.map(async (botId) => {
        const existingBot = await prisma.user.findUnique({
          where: { id: botId },
        });

        if (!existingBot) {
          await prisma.user.create({
            data: {
              id: botId,
              name: botId.replace("bot_", ""),
              role: "PLAYER",
            },
          });
          console.log(`Bot ${botId} created`);
        }
      })
    );

  console.log("All bots initialized");
}

main()
  .catch((e) => {
    console.error("Ошибка при инициализации ботов:", e);
    process.exit(1);
  }); 