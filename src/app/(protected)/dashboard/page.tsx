"use client";

import { MatchesTable } from "@/components/matches/MatchesTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRoleText, getWinRate } from '@/lib/userUtils';
import { useI18n } from '@/lib/i18n/context';
import { trpc } from '@/utils/trpc';
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { ChartPie, Edit, Loader2, Trophy, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: user, isLoading } = trpc.users.me.useQuery();
  const { data: session } = useSession();
  const { t, locale } = useI18n();
  const isAdmin = session?.user.role === "ADMIN";
  const dateLocale = locale === 'en' ? enUS : ru;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">{t('common.failedToLoadUser')}</div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('common.myProfile')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('common.personalInfo')}</p>
        </div>
        {isAdmin && (
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/users/${user.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {t('common.editProfile')}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 py-6 space-y-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>{t('common.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/10">
                  <AvatarImage src={user.image || ''} />
                  <AvatarFallback className="text-4xl bg-primary/5">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <Badge variant="outline" className="px-3 py-1 font-medium">
                  {getRoleText(user.role)}
                </Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  {user.email && <p className="text-muted-foreground">{user.email}</p>}
                </div>

                {user.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="space-y-1 bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('common.rating')}</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        {user.stats.rating}
                      </p>
                    </div>
                    <div className="space-y-1 bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('common.gamesPlayed')}</p>
                      <p className="text-2xl font-bold">{user.stats.gamesPlayed}</p>
                    </div>
                    <div className="space-y-1 bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('common.winRate')}</p>
                      <p className="text-2xl font-bold">
                        {getWinRate(user.stats?.wins || 0, user.stats?.gamesPlayed || 0)}
                      </p>
                    </div>
                    <div className="space-y-1 bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('common.joined')}</p>
                      <p className="text-base">
                        {user.stats.createdAt
                          ? format(new Date(user.stats.createdAt), 'd MMMM yyyy', {
                              locale: dateLocale,
                            })
                          : t('common.unknown')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {user.stats && (
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stats">{t('common.stats')}</TabsTrigger>
              <TabsTrigger value="matches">{t('common.matchHistory')}</TabsTrigger>
            </TabsList>
            <TabsContent value="stats" className="mt-6">
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle>{t('common.detailedStats')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
                        <div className="bg-primary/5 px-4 py-3 border-b border-border/40">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ChartPie className="h-5 w-5 text-primary" />
                            {t('common.generalStats')}
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.wins')}</p>
                                <p className="text-lg sm:text-xl font-bold text-green-500">
                                  {user.stats.wins}
                                </p>
                              </div>
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.losses')}</p>
                                <p className="text-lg sm:text-xl font-bold text-red-500">
                                  {user.stats.losses}
                                </p>
                              </div>
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.draws')}</p>
                                <p className="text-lg sm:text-xl font-bold text-yellow-500">
                                  {user.stats.draws}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">
                                  {t('common.totalGames')}: {user.stats.gamesPlayed}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-sm"></div> {t('common.wins')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div> {t('common.losses')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> {t('common.draws')}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-5 bg-muted rounded-md overflow-hidden flex">
                                {user.stats.gamesPlayed > 0 && (
                                  <>
                                    <div
                                      className="h-full bg-green-500"
                                      style={{
                                        width: `${(user.stats.wins / user.stats.gamesPlayed) * 100}%`,
                                      }}
                                    ></div>
                                    <div
                                      className="h-full bg-red-500"
                                      style={{
                                        width: `${(user.stats.losses / user.stats.gamesPlayed) * 100}%`,
                                      }}
                                    ></div>
                                    <div
                                      className="h-full bg-yellow-500"
                                      style={{
                                        width: `${(user.stats.draws / user.stats.gamesPlayed) * 100}%`,
                                      }}
                                    ></div>
                                  </>
                                )}
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {t('common.winsPercent')}:{' '}
                                  {user.stats.gamesPlayed
                                    ? ((user.stats.wins / user.stats.gamesPlayed) * 100).toFixed(1)
                                    : 0}
                                  %
                                </span>
                                <span>
                                  {t('common.lossesPercent')}:{' '}
                                  {user.stats.gamesPlayed
                                    ? ((user.stats.losses / user.stats.gamesPlayed) * 100).toFixed(
                                        1
                                      )
                                    : 0}
                                  %
                                </span>
                                <span>
                                  {t('common.drawsPercent')}:{' '}
                                  {user.stats.gamesPlayed
                                    ? ((user.stats.draws / user.stats.gamesPlayed) * 100).toFixed(1)
                                    : 0}
                                  %
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">{t('common.totalPoints')}</p>
                                <p className="text-xl font-bold">{user.stats.totalScore || 0}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
                        <div className="bg-primary/5 px-4 py-3 border-b border-border/40">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-blue-500" />
                            {t('common.rating')}
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-green-500/10 rounded-lg">
                              <p className="text-xs sm:text-sm text-muted-foreground">{t('common.maxRating')}</p>
                              <p className="text-lg sm:text-xl font-bold text-green-500">
                                {user.stats.maxRating || user.stats.rating}
                              </p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-primary/10 rounded-lg">
                              <p className="text-xs sm:text-sm text-muted-foreground">{t('common.currentRating')}</p>
                              <p className="text-lg sm:text-xl font-bold text-primary">{user.stats.rating}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-red-500/10 rounded-lg">
                              <p className="text-xs sm:text-sm text-muted-foreground">{t('common.minRating')}</p>
                              <p className="text-lg sm:text-xl font-bold text-red-500">
                                {user.stats.minRating || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
                        <div className="bg-primary/5 px-4 py-3 border-b border-border/40">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 text-primary"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M3 9h18M9 21V9" />
                            </svg>
                            {t('common.divisionStats')}
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.wins')}</p>
                                <p className="text-lg sm:text-xl font-bold text-green-500">
                                  {user.stats.winsDivisions || 0}
                                </p>
                              </div>
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.losses')}</p>
                                <p className="text-lg sm:text-xl font-bold text-red-500">
                                  {user.stats.lossesDivisions || 0}
                                </p>
                              </div>
                              <div className="space-y-1 text-center">
                                <p className="text-xs sm:text-sm font-medium">{t('common.draws')}</p>
                                <p className="text-lg sm:text-xl font-bold text-yellow-500">
                                  {user.stats.drawsDivisions || 0}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">
                                  {t('common.totalDivisions')}: {user.stats.totalDivisions || 0}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-sm"></div> {t('common.wins')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div> {t('common.losses')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> {t('common.draws')}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-5 bg-muted rounded-md overflow-hidden flex">
                                {user.stats.totalDivisions > 0 && (
                                  <>
                                    <div
                                      className="h-full bg-green-500"
                                      style={{
                                        width: `${(user.stats.winsDivisions / user.stats.totalDivisions) * 100}%`,
                                      }}
                                    ></div>
                                    <div
                                      className="h-full bg-red-500"
                                      style={{
                                        width: `${(user.stats.lossesDivisions / user.stats.totalDivisions) * 100}%`,
                                      }}
                                    ></div>
                                    <div
                                      className="h-full bg-yellow-500"
                                      style={{
                                        width: `${(user.stats.drawsDivisions / user.stats.totalDivisions) * 100}%`,
                                      }}
                                    ></div>
                                  </>
                                )}
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {t('common.winsPercent')}:{' '}
                                  {user.stats.totalDivisions
                                    ? (
                                        (user.stats.winsDivisions / user.stats.totalDivisions) *
                                        100
                                      ).toFixed(1)
                                    : 0}
                                  %
                                </span>
                                <span>
                                  {t('common.lossesPercent')}:{' '}
                                  {user.stats.totalDivisions
                                    ? (
                                        (user.stats.lossesDivisions / user.stats.totalDivisions) *
                                        100
                                      ).toFixed(1)
                                    : 0}
                                  %
                                </span>
                                <span>
                                  {t('common.drawsPercent')}:{' '}
                                  {user.stats.totalDivisions
                                    ? (
                                        (user.stats.drawsDivisions / user.stats.totalDivisions) *
                                        100
                                      ).toFixed(1)
                                    : 0}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="matches" className="mt-6">
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle>{t('common.matchHistory')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px]">
                    <MatchesTable userId={user.id} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}