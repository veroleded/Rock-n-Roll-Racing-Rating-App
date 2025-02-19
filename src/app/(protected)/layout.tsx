"use client";

import { trpc } from "@/utils/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();
  const { data: joinStatus } = trpc.auth.checkJoinRequired.useQuery(undefined, {
    enabled: !!session,
  });

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    } else if (session && joinStatus?.joinRequired) {
      router.push("/join-bot");
    }
  }, [session, isLoading, joinStatus, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
