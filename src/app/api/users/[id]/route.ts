import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { stats: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await request.json();

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { stats: true },
    });

    if (!existingUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Обновляем пользователя и его статистику в транзакции
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.id },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
        },
        include: { stats: true },
      });

      if (data.stats && user.stats) {
        await tx.stats.update({
          where: { id: user.stats.id },
          data: {
            rating: data.stats.rating,
            wins: data.stats.wins,
            losses: data.stats.losses,
          },
        });
      }

      return user;
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
