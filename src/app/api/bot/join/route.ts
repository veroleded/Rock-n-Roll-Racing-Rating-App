import { verifyBotRequest } from "@/lib/botAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Проверяем подпись запроса
    if (!verifyBotRequest(request)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await request.json();
    const { userId, username, avatar } = data;

    if (!userId || !username) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Ищем пользователя
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });

    if (user) {
      // Если пользователь существует, просто обновляем его статус
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          hasJoinedBot: true,
          name: username, // Обновляем имя на случай, если оно изменилось
          image: avatar, // Обновляем аватар
        },
        include: { stats: true },
      });
    } else {
      // Если пользователя нет, создаем нового
      user = await prisma.user.create({
        data: {
          id: userId,
          name: username,
          image: avatar,
          role: "PLAYER",
          hasJoinedBot: true,
          stats: {
            create: {
              rating: 1000,
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              draws: 0,
            },
          },
        },
        include: { stats: true },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in bot join endpoint:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
