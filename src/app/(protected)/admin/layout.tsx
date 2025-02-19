"use client";

import { trpc } from "@/utils/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();
  const { data: adminCheck } = trpc.auth.checkAdmin.useQuery(undefined, {
    enabled: !!session,
  });

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    } else if (session && adminCheck && !adminCheck.isAdmin) {
      router.push("/dashboard");
    }
  }, [session, isLoading, adminCheck, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!session || !adminCheck?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Панель управления</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a
                  href="/admin/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Пользователи
                </a>
                <a
                  href="/admin/matches"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Матчи
                </a>
                <a
                  href="/admin/stats"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Статистика
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">
                {session.user.name} ({session.user.role.toLowerCase()})
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
