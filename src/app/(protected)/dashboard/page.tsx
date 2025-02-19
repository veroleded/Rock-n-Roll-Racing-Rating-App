import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Добро пожаловать, {session?.user?.name || "Игрок"}!
        </h2>
        <p className="text-gray-600">
          Здесь вы можете просматривать статистику игроков и историю матчей.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Таблица игроков
        </h3>
        {/* TODO: Добавить компонент PlayerTable */}
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          История матчей
        </h3>
        {/* TODO: Добавить компонент MatchHistory */}
      </div>

      {session?.user?.role !== "PLAYER" && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Добавить матч
          </h3>
          {/* TODO: Добавить компонент AddMatchForm */}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Данные сессии
        </h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
