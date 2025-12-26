import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Варианты сетов для robohash
const sets = ['set1', 'set2', 'set3', 'set4'];
// Варианты фонов
const backgrounds = ['bg1', 'bg2'];

async function main() {
  console.log('[init-bots] Начинаем инициализацию ботов...');

  const botIds: string[] = [
    'bot_snake',
    'bot_hawk',
    'bot_ivan',
    'bot_kat',
    'bot_jake',
    'bot_tarquinn',
    'bot_olaf',
    'bot_rash',
    'bot_violet',
    'bot_vinnie',
    'bot_viper',
    'bot_grinder',
    'bot_rage',
    'bot_roadkill',
    'bot_butcher',
    'bot_slash',
  ];

  let createdCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  // Важно: создаём ботов последовательно, чтобы не выбить лимит соединений Postgres
  for (const botId of botIds) {
    try {
      const existingBot = await prisma.user.findUnique({
        where: { id: botId },
      });

      if (!existingBot) {
        const set = getRandomItem(sets);
        const bg = getRandomItem(backgrounds);
        const avatarUrl = `https://robohash.org/${botId}?set=${set}&bgset=${bg}&size=300x300`;
        await prisma.user.create({
          data: {
            id: botId,
            name: botId,
            role: 'PLAYER',
            image: avatarUrl,
            stats: {
              create: {
                rating: 1100,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
              },
            },
          },
        });
        console.log(`[init-bots] ✓ Бот ${botId} создан`);
        createdCount++;
      } else {
        console.log(`[init-bots] - Бот ${botId} уже существует, пропускаем`);
        existingCount++;
      }
    } catch (error) {
      console.error(`[init-bots] ✗ Ошибка при создании бота ${botId}:`, error);
      errorCount++;
      // Продолжаем создание остальных ботов даже при ошибке
    }
  }

  console.log(
    `[init-bots] Инициализация завершена: создано ${createdCount}, уже существует ${existingCount}, ошибок ${errorCount}`
  );

  if (errorCount > 0) {
    console.warn(`[init-bots] Внимание: при инициализации произошло ${errorCount} ошибок`);
  }
}

main()
  .catch((e) => {
    console.error('[init-bots] Критическая ошибка при инициализации ботов:', e);
    // Не завершаем процесс с ошибкой, чтобы не блокировать запуск приложения
    // Боты могут быть созданы вручную позже
    process.exitCode = 0;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });