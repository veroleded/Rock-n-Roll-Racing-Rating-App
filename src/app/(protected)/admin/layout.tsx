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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!session || !adminCheck?.isAdmin) {
    return null;
  }

  return <>{children}</>;
}
