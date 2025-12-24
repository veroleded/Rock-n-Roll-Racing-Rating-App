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
  console.log('Начинаем инициализацию ботов...');

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

  // Важно: создаём ботов последовательно, чтобы не выбить лимит соединений Postgres
  // (в dev docker-compose он ограничен `max_connections=10`).
  for (const botId of botIds) {
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
      console.log(`Bot ${botId} created`);
    }
  }

  console.log('All bots initialized');
}

main()
  .catch((e) => {
    console.error('Ошибка при инициализации ботов:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });