"use client";

import { BackButton } from "@/components/BackButton";
import { MatchForm } from "@/components/MatchForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function EditMatchPage() {
  const params = useParams();

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold tracking-tight">Изменить матч <span className="text-sm"># {params.id}</span></h1>
          </div>
          <p className="text-muted-foreground">
            Заполните форму для изменеия матча
          </p>
        </div>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle>Информация о матче</CardTitle>
          <CardDescription>
            Выберите режим игры, загрузите файл матча и укажите участников
            каждой команды
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchForm editMatchId={params.id as string} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/40 bg-card p-4 shadow-sm">
        <h2 className="font-medium mb-2">Примечание</h2>
        <p className="text-sm text-muted-foreground">
          После изменения матча, статистика игроков будет автоматически
          обновлена. Убедитесь, что все данные введены корректно перед отправкой
          формы.
        </p>
      </div>
    </div>
  );
}
