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
import { useI18n } from "@/lib/i18n/context";
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
import { ru, enUS } from "date-fns/locale";

function formatFileSize(bytes: number, locale: 'ru' | 'en'): string {
  if (bytes === 0) return locale === 'ru' ? "0 Б" : "0 B";
  const k = 1024;
  const sizes = locale === 'ru' ? ["Б", "КБ", "МБ", "ГБ"] : ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function DownloadsAdminPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: files, isLoading, refetch } = trpc.downloads.list.useQuery();
  const dateLocale = locale === 'en' ? enUS : ru;
  const uploadMutation = trpc.downloads.upload.useMutation({
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('common.fileUploaded'),
      });
      refetch();
      setSelectedGameFile(null);
      setSelectedEmulatorFile(null);
      if (gameFileInputRef.current) gameFileInputRef.current.value = "";
      if (emulatorFileInputRef.current) emulatorFileInputRef.current.value = "";
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.uploadFailed'),
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
        title: t('common.error'),
        description: t('common.selectFileToUpload'),
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
          <h1 className="text-2xl sm:text-3xl font-bold">{t('common.downloadsManagement')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            {t('common.downloadsManagementDesc')}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/downloads")} className="w-full sm:w-auto">
          {t('common.backToDownloads')}
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
                <CardTitle>{t('common.gameInstaller')}</CardTitle>
              </div>
              <CardDescription>
                {t('common.gameInstallerDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gameFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{t('common.currentFile')}:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gameFile.fileName} ({formatFileSize(gameFile.fileSize, locale)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('common.uploaded')}:{" "}
                    {formatDistanceToNow(new Date(gameFile.uploadedAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="game-file">{t('common.selectFile')}</Label>
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
                    {t('common.selected')}: {selectedGameFile.name} (
                    {formatFileSize(selectedGameFile.size, locale)})
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
                    {t('common.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('common.upload')}
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
                <CardTitle>{t('common.emulatorInstaller')}</CardTitle>
              </div>
              <CardDescription>
                {t('common.emulatorInstallerDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emulatorFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{t('common.currentFile')}:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {emulatorFile.fileName} (
                    {formatFileSize(emulatorFile.fileSize, locale)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('common.uploaded')}:{" "}
                    {formatDistanceToNow(new Date(emulatorFile.uploadedAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="emulator-file">{t('common.selectFile')}</Label>
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
                    {t('common.selected')}: {selectedEmulatorFile.name} (
                    {formatFileSize(selectedEmulatorFile.size, locale)})
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
                    {t('common.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('common.upload')}
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

