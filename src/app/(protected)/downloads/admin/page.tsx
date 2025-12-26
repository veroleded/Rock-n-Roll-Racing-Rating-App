"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";
import {
  Download,
  Gamepad2,
  HardDrive,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function DownloadsAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: files, isLoading, refetch } = trpc.downloads.list.useQuery();
  const uploadMutation = trpc.downloads.upload.useMutation({
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Файл успешно загружен",
      });
      refetch();
      setSelectedGameFile(null);
      setSelectedEmulatorFile(null);
      if (gameFileInputRef.current) gameFileInputRef.current.value = "";
      if (emulatorFileInputRef.current) emulatorFileInputRef.current.value = "";
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить файл",
        variant: "destructive",
      });
    },
  });

  const [selectedGameFile, setSelectedGameFile] = useState<File | null>(null);
  const [selectedEmulatorFile, setSelectedEmulatorFile] = useState<File | null>(
    null
  );
  const gameFileInputRef = useRef<HTMLInputElement>(null);
  const emulatorFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    router.push("/downloads");
    return null;
  }

  const gameFile = files?.find((f) => f.type === "GAME");
  const emulatorFile = files?.find((f) => f.type === "EMULATOR");

  const handleFileSelect = (
    file: File | null,
    type: "GAME" | "EMULATOR"
  ) => {
    if (type === "GAME") {
      setSelectedGameFile(file);
    } else {
      setSelectedEmulatorFile(file);
    }
  };

  const handleUpload = async (type: "GAME" | "EMULATOR") => {
    const file = type === "GAME" ? selectedGameFile : selectedEmulatorFile;
    if (!file) {
      toast({
        title: "Ошибка",
        description: "Выберите файл для загрузки",
        variant: "destructive",
      });
      return;
    }

    // Читаем файл как base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = (e.target?.result as string).split(",")[1]; // Убираем префикс data:...
      try {
        await uploadMutation.mutateAsync({
          type,
          fileName: file.name,
          fileData: base64Data,
        });
      } catch (error) {
        // Ошибка уже обработана в onError
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Управление загрузками</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Загрузите установочники игры и эмулятора
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/downloads")} className="w-full sm:w-auto">
          Вернуться к загрузкам
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Загрузка игры */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                <CardTitle>Установочник игры</CardTitle>
              </div>
              <CardDescription>
                Загрузите новую версию установочника игры
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gameFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Текущий файл:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gameFile.fileName} ({formatFileSize(gameFile.fileSize)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Загружено:{" "}
                    {formatDistanceToNow(new Date(gameFile.uploadedAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="game-file">Выберите файл</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="game-file"
                    type="file"
                    ref={gameFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleFileSelect(file, "GAME");
                    }}
                    className="flex-1"
                  />
                  {selectedGameFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedGameFile(null);
                        if (gameFileInputRef.current)
                          gameFileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedGameFile && (
                  <p className="text-xs text-muted-foreground">
                    Выбран: {selectedGameFile.name} (
                    {formatFileSize(selectedGameFile.size)})
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => handleUpload("GAME")}
                disabled={!selectedGameFile || uploadMutation.isLoading}
              >
                {uploadMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Загрузка эмулятора */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                <CardTitle>Установочник эмулятора</CardTitle>
              </div>
              <CardDescription>
                Загрузите новую версию установочника эмулятора
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emulatorFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Текущий файл:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {emulatorFile.fileName} (
                    {formatFileSize(emulatorFile.fileSize)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Загружено:{" "}
                    {formatDistanceToNow(new Date(emulatorFile.uploadedAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="emulator-file">Выберите файл</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="emulator-file"
                    type="file"
                    ref={emulatorFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleFileSelect(file, "EMULATOR");
                    }}
                    className="flex-1"
                  />
                  {selectedEmulatorFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedEmulatorFile(null);
                        if (emulatorFileInputRef.current)
                          emulatorFileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedEmulatorFile && (
                  <p className="text-xs text-muted-foreground">
                    Выбран: {selectedEmulatorFile.name} (
                    {formatFileSize(selectedEmulatorFile.size)})
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => handleUpload("EMULATOR")}
                disabled={!selectedEmulatorFile || uploadMutation.isLoading}
              >
                {uploadMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

