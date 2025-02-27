"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { trpc } from "@/utils/trpc";
import { Home } from "lucide-react";
import Link from "next/link";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { SignOutButton } from "./SignOutButton";

export function Header() {
  const { data: session } = trpc.auth.getSession.useQuery();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center text-foreground hover:text-foreground/80"
            >
              <Home className="h-6 w-6" />
              <span className="ml-2 text-lg font-semibold hidden md:block">
                {"Rock'n'Roll Racing"}
              </span>
            </Link>
            <div className="hidden md:block">
              <MainNav />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex md:items-center md:gap-4">
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
            <MobileNav
              userName={session?.user?.name}
              userRole={session?.user?.role}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
