import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ID пользователей, которых мы создали в seed.ts
const testUserIds = [
  "1234567890",
  "1234567891",
  "1234567892",
  "1234567893",
  "1234567894",
  "1234567895",
  "1234567896",
  "1234567897",
  "1234567898",
  "1234567899",
  "1234567900",
  "1234567901",
  "1234567902",
  "1234567903",
  "1234567904",
  "1234567905",
  "1234567906",
  "1234567907",
  "1234567908",
  "1234567909",
];

async function main() {
  console.log("Начинаем удаление тестовых пользователей...");

  // Удаляем пользователей и их статистику (каскадное удаление)
  const { count } = await prisma.user.deleteMany({
    where: {
      id: {
        in: testUserIds,
      },
    },
  });

  console.log(`Удалено пользователей: ${count}`);
  console.log("Очистка базы данных завершена!");
}

main()
  .catch((e) => {
    console.error("Ошибка при очистке базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
