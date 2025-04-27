"use client";

import { Header } from "@/components/Header";
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-muted/10">
        <div className="mx-auto  px-4 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
