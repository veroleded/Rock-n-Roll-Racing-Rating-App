"use client";

import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSignIn = async () => {
    try {
      await signIn("discord", {
        callbackUrl: "/dashboard",
        redirect: false,
      });
    } catch (error) {
      console.error("Ошибка входа:", error);
    }
  };

  if (status === "loading") {
    return <div>Загрузка...</div>;
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
        <div className="mt-8">
          <button
            onClick={handleSignIn}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <DiscordLogoIcon className="h-5 w-5" />
            </span>
            Войти через Discord
          </button>
        </div>
      </div>
    </div>
  );
}
