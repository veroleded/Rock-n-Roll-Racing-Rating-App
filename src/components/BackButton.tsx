"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {t('common.back')}
    </Button>
  );
}
