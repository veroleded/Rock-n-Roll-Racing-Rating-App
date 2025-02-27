"use client";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/utils/trpc";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function MatchesPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const canAddMatch =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold tracking-tight">
              История матчей
            </h1>
          </div>
          <p className="text-muted-foreground">
            Просмотр и управление историей всех матчей
          </p>
        </div>
        {canAddMatch && (
          <Button asChild>
            <Link href="/matches/add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Добавить матч
            </Link>
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Список матчей</CardTitle>
            <CardDescription>
              История всех проведенных матчей с результатами
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border">
              {/* Здесь будет таблица с историей матчей */}
              <div className="p-4 text-sm text-muted-foreground">
                Таблица с историей матчей будет добавлена позже
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
