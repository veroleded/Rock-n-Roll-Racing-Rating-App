"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { trpc } from "@/utils/trpc";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { t } = useI18n();
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
        setError(`${t('common.loginError')}: ${result.error}`);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      setError(t('common.loginErrorOccurred'));
      console.error("Ошибка входа:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            {t('common.loginTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {t('common.loginDescription')}
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
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-6 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('common.signingIn')}
              </>
            ) : (
              <>
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <DiscordLogoIcon className="h-5 w-5" />
                </span>
                {t('common.signInWithDiscord')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
