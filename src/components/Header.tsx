"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export function Header() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const pathname = usePathname();
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <header className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center text-foreground hover:text-foreground/80"
              >
                <Home className="h-6 w-6" />
                <span className="ml-2 text-lg font-semibold">
                  {"Rock'n'Roll Racing"}
                </span>
              </Link>
            </div>
            {isAdmin && (
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <Button variant="ghost" asChild>
                  <Link href={isAdminPage ? "/dashboard" : "/admin"}>
                    {isAdminPage
                      ? "Вернуться к статистике"
                      : "Панель управления"}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              {session?.user?.name}
              {session?.user?.role && (
                <span className="ml-2 text-xs opacity-70">
                  ({session.user.role.toLowerCase()})
                </span>
              )}
            </div>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
