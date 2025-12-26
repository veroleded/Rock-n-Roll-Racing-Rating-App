"use client";

import { BackButton } from "@/components/BackButton";
import { MatchesTable } from "@/components/matches/MatchesTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/utils/trpc";
import { GameMode } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function MatchesPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const canAddMatch =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  const [filters, setFilters] = useState({
    onlyMyMatches: false,
    onlyRated: false,
    gameMode: "all" as "all" | GameMode,
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              История матчей
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Просмотр и управление историей всех матчей
          </p>
        </div>
        {canAddMatch && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/matches/add" className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Добавить матч
            </Link>
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="h-full border-border/40 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>История матчей</CardTitle>
            <CardDescription>Фильтры для просмотра матчей</CardDescription>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 lg:gap-8 pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="my-matches"
                  checked={filters.onlyMyMatches}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyMyMatches: checked,
                    }))
                  }
                />
                <Label htmlFor="my-matches" className="text-sm">Только мои матчи</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="rated-matches"
                  checked={filters.onlyRated}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, onlyRated: checked }))
                  }
                />
                <Label htmlFor="rated-matches" className="text-sm">Только рейтинговые</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Режим игры</Label>
                <Select
                  value={filters.gameMode}
                  onValueChange={(value: "all" | GameMode) =>
                    setFilters((prev) => ({ ...prev, gameMode: value }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все режимы</SelectItem>
                    <SelectItem value="TWO_VS_TWO">2 vs 2</SelectItem>
                    <SelectItem value="THREE_VS_THREE">3 vs 3</SelectItem>
                    <SelectItem value="TWO_VS_TWO_VS_TWO">2 vs 2 vs 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <MatchesTable
              userId={filters.onlyMyMatches ? session?.user?.id : undefined}
              onlyRated={filters.onlyRated}
              gameMode={
                filters.gameMode === "all" ? undefined : filters.gameMode
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
