"use client";

import { trpc } from "@/utils/trpc";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserFormData {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  stats: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  } | null;
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserFormData | null>(null);

  const { data: userData, isLoading } = trpc.users.byId.useQuery(params.id);
  const { mutate: updateUser, isLoading: isUpdating } =
    trpc.users.update.useMutation({
      onSuccess: () => {
        router.push("/admin/users");
      },
      onError: (error) => {
        console.error("Ошибка при обновлении пользователя:", error);
      },
    });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Загрузка данных пользователя...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">Пользователь не найден</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    updateUser({
      id: user.id,
      name: user.name || undefined,
      role: user.role,
      stats: user.stats || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Редактирование пользователя
          </h2>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 divide-y divide-gray-200"
      >
        <div className="space-y-8 divide-y divide-gray-200">
          <div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Имя
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={user.name || ""}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={user.email || ""}
                    onChange={(e) =>
                      setUser({ ...user, email: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700"
                >
                  Роль
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    name="role"
                    value={user.role}
                    onChange={(e) =>
                      setUser({ ...user, role: e.target.value as Role })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="PLAYER">Игрок</option>
                    <option value="MODERATOR">Модератор</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                </div>
              </div>

              {user.stats && (
                <>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="rating"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Рейтинг
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="rating"
                        id="rating"
                        value={user.stats.rating}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            stats: {
                              ...user.stats!,
                              rating: parseInt(e.target.value),
                            },
                          })
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="wins"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Победы
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="wins"
                        id="wins"
                        value={user.stats.wins}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            stats: {
                              ...user.stats!,
                              wins: parseInt(e.target.value),
                            },
                          })
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="losses"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Поражения
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="losses"
                        id="losses"
                        value={user.stats.losses}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            stats: {
                              ...user.stats!,
                              losses: parseInt(e.target.value),
                            },
                          })
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
