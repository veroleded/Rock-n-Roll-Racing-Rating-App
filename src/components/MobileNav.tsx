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
import { useI18n } from "@/lib/i18n/context";
import { Menu, MessageCircle, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./LanguageToggle";

interface MobileNavProps {
  userName?: string | null;
  userRole?: string | null;
}

export function MobileNav({ userName, userRole }: MobileNavProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const version = getVersion();

  const baseNavItems = [
    {
      title: t('common.home'),
      href: "/dashboard",
    },
    {
      title: t('common.users'),
      href: "/users",
    },
    {
      title: t('common.matches'),
      href: "/matches",
    },
  ];

  const downloadsNavItem = {
    title: t('common.downloads'),
    href: "/downloads",
  };
  
  // Показываем вкладку "Загрузки" только для версии bogdan
  const navItems = version === 'bogdan' 
    ? [...baseNavItems, downloadsNavItem]
    : baseNavItems;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('common.openMenu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{t('common.menu')}</SheetTitle>
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

          {version === 'bogdan' && (
            <div className="border-t pt-4 mt-4">
              <div className="flex flex-col gap-3">
                <a
                  href="https://discord.gg/4bDwf3zaZp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{t('common.discordChannelFull')}</span>
                </a>
                <a
                  href="mailto:fasteddierrr@gmail.com"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  <span>fasteddierrr@gmail.com</span>
                </a>
              </div>
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>
              <SignOutButton className="w-full" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
