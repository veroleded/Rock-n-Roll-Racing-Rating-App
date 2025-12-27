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
import { useI18n } from "@/lib/i18n/context";

export default function AddMatchPage() {
  const { t } = useI18n();
  
  return (
    <div className="py-6 space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('common.addMatch')}</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('common.viewPlayers')}
          </p>
        </div>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle>{t('common.basicInfo')}</CardTitle>
          <CardDescription>
            {t('common.viewPlayers')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchForm />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/40 bg-card p-4 shadow-sm">
        <h2 className="font-medium mb-2">{t('common.viewPlayers')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('common.viewPlayers')}
        </p>
      </div>
    </div>
  );
}
