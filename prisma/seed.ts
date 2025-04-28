import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Функция для получения случайного элемента из массива
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Варианты сетов для robohash
const sets = ["set1", "set2", "set3", "set4"];
// Варианты фонов
const backgrounds = ["bg1", "bg2"];

const users = [
  { name: "Александр", discordId: "1234567890" },
  { name: "Дмитрий", discordId: "1234567891" },
  { name: "Сергей", discordId: "1234567892" },
  { name: "Михаил", discordId: "1234567893" },
  { name: "Андрей", discordId: "1234567894" },
  { name: "Иван", discordId: "1234567895" },
  { name: "Николай", discordId: "1234567896" },
  { name: "Максим", discordId: "1234567897" },
  { name: "Артём", discordId: "1234567898" },
  { name: "Владимир", discordId: "1234567899" },
  { name: "Евгений", discordId: "1234567900" },
  { name: "Павел", discordId: "1234567901" },
  { name: "Роман", discordId: "1234567902" },
  { name: "Константин", discordId: "1234567903" },
  { name: "Виктор", discordId: "1234567904" },
  { name: "Олег", discordId: "1234567905" },
  { name: "Денис", discordId: "1234567906" },
  { name: "Антон", discordId: "1234567907" },
  { name: "Кирилл", discordId: "1234567908" },
  { name: "Григорий", discordId: "1234567909" },
];

async function main() {
  console.log("Начинаем заполнение базы данных...");

  for (const user of users) {
    // Генерируем случайный аватар с разными параметрами
    const set = getRandomItem(sets);
    const bg = getRandomItem(backgrounds);
    const avatarUrl = `https://robohash.org/${user.discordId}?set=${set}&bgset=${bg}&size=300x300`;

    const createdUser = await prisma.user.create({
      data: {
        id: user.discordId,
        name: user.name,
        role: 'PLAYER',
        hasJoinedBot: true,
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

    console.log(
      `Создан пользователь: ${createdUser.name} (${createdUser.image})`
    );
  }

  console.log("База данных успешно заполнена!");
}

main()
  .catch((e) => {
    console.error("Ошибка при заполнении базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
