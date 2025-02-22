"use client";

import { Button } from "@/components/ui/button";
import { ExitIcon } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant="destructive"
      size="sm"
    >
      <ExitIcon className="mr-2 h-4 w-4" />
      {isLoading ? "Выход..." : "Выйти"}
    </Button>
  );
}
