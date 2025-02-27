"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => signOut()}
      className={cn(className)}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Выйти
    </Button>
  );
}
