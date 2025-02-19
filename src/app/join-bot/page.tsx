import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function JoinBotPage() {
  const session = await getServerSession(authOptions);

  // Если пользователь уже присоединился к боту, перенаправляем на дашборд
  if (session?.user.hasJoinedBot) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Присоединитесь к боту
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Для использования приложения необходимо присоединиться к боту в
          Discord
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Инструкции:</h3>
              <div className="mt-2 text-sm text-gray-500">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Присоединитесь к нашему Discord серверу, если вы еще не
                    сделали этого
                  </li>
                  <li>
                    Найдите канал <code>#commands</code> или{" "}
                    <code>#bot-commands</code>
                  </li>
                  <li>
                    Отправьте команду <code>!join</code> в этот канал
                  </li>
                  <li>
                    После подтверждения от бота, обновите эту страницу или
                    попробуйте войти снова
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a
                  href={`https://discord.com/channels/${process.env.DISCORD_GUILD_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Перейти на Discord сервер
                </a>
              </div>
              <div className="text-sm">
                <a
                  href="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Попробовать войти снова
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
