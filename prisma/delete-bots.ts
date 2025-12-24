import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Последовательно, чтобы не упереться в лимит соединений Postgres в dev.
  for (const botId of botIds) {
    const bot = await prisma.user.findUnique({
      where: { id: botId },
    });

    if (bot) {
      await prisma.user.delete({ where: { id: botId } });
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
