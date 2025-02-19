"use client";

import { trpc } from "@/utils/trpc";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = trpc.auth.getSession.useQuery();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await signIn("discord", {
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setError(`Ошибка входа: ${result.error}`);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      setError("Произошла ошибка при попытке входа");
      console.error("Ошибка входа:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            {"Rock'n'Roll Racing"}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Войдите через Discord для доступа к игровой статистике
          </p>
        </div>
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div className="mt-8">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <DiscordLogoIcon className="h-5 w-5" />
            </span>
            {isLoading ? "Вход..." : "Войти через Discord"}
          </button>
        </div>
      </div>
    </div>
  );
}
