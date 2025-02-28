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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <Tabs defaultValue="my" className="h-full flex flex-col">
          <div className="border-b">
            <TabsList className="w-full">
              <TabsTrigger value="my" className="flex-1">
                Мои матчи
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1">
                Все матчи
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 pt-6">
            <TabsContent value="all" className="h-full m-0">
              <Card className="h-full border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle>Все матчи</CardTitle>
                  <CardDescription>
                    История всех проведенных матчей
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Таблица матчей будет добавлена позже
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my" className="h-full m-0">
              <Card className="h-full border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle>Мои матчи</CardTitle>
                  <CardDescription>История ваших матчей</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Таблица ваших матчей будет добавлена позже
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
