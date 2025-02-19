import { verifyBotRequest } from "@/lib/botAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Проверяем подпись запроса
    if (!verifyBotRequest(request)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = params;

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hasJoinedBot: true },
    });

    if (!user) {
      return NextResponse.json({ hasJoinedBot: false });
    }

    return NextResponse.json({ hasJoinedBot: user.hasJoinedBot });
  } catch (error) {
    console.error("Error checking user status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
