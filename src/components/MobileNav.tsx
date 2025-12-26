"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getVersion } from "@/lib/version";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./theme-toggle";

interface MobileNavProps {
  userName?: string | null;
  userRole?: string | null;
}

const baseNavItems = [
  {
    title: "Главная",
    href: "/dashboard",
  },
  {
    title: "Таблица игроков",
    href: "/users",
  },
  {
    title: "Матчи",
    href: "/matches",
  },
];

const downloadsNavItem = {
  title: "Загрузки",
  href: "/downloads",
};

export function MobileNav({ userName, userRole }: MobileNavProps) {
  const pathname = usePathname();
  const version = getVersion();
  
  // Показываем вкладку "Загрузки" только для версии bogdan
  const navItems = version === 'bogdan' 
    ? [...baseNavItems, downloadsNavItem]
    : baseNavItems;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Открыть меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Меню</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  pathname === item.href && "text-foreground font-medium"
                )}
              >
                {item.title}
              </Link>
            ))}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{userName}</span>
                  {userRole && (
                    <span className="text-xs text-muted-foreground">
                      {userRole.toLowerCase()}
                    </span>
                  )}
                </div>
                <ThemeToggle />
              </div>
              <SignOutButton className="w-full" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
