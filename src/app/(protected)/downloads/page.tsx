"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { Download, Gamepad2, HardDrive, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export default function DownloadsPage() {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: files, isLoading } = trpc.downloads.list.useQuery();

  const isAdmin = session?.user?.role === "ADMIN";

  const gameFile = files?.find((f) => f.type === "GAME");
  const emulatorFile = files?.find((f) => f.type === "EMULATOR");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Загрузки</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Скачайте установочники игры и эмулятора
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/downloads/admin")} className="w-full sm:w-auto">
            Управление файлами
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                <CardTitle>Установочник игры</CardTitle>
              </div>
              <CardDescription>
                Скачайте последнюю версию игры
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameFile ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{gameFile.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Размер: {formatFileSize(gameFile.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Загружено:{" "}
                      {formatDistanceToNow(new Date(gameFile.uploadedAt), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = `/api/downloads/${gameFile.id}`;
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Файл не загружен
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                <CardTitle>Установочник эмулятора</CardTitle>
              </div>
              <CardDescription>
                Скачайте последнюю версию эмулятора
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emulatorFile ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">
                      {emulatorFile.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Размер: {formatFileSize(emulatorFile.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Загружено:{" "}
                      {formatDistanceToNow(
                        new Date(emulatorFile.uploadedAt),
                        {
                          addSuffix: true,
                          locale: ru,
                        }
                      )}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = `/api/downloads/${emulatorFile.id}`;
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Файл не загружен
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

