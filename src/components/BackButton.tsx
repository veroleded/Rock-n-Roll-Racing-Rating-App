"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Назад
    </Button>
  );
}
