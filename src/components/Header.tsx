"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { trpc } from "@/utils/trpc";
import { useI18n } from "@/lib/i18n/context";
import { MessageCircle, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { SignOutButton } from "./SignOutButton";
import { getVersion } from "@/lib/version";

export function Header() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { t } = useI18n();
  const version = getVersion();
  const isBogdan = version === 'bogdan';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="Rock'n'Roll Racing"
                width={180}
                height={48}
                className="h-12 w-auto object-contain"
                priority
              />
            </Link>
            <div className="hidden md:block">
              <MainNav />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex md:items-center md:gap-2">
              {isBogdan && (
                <>
                  <a
                    href="https://discord.gg/4bDwf3zaZp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title={t('common.discordChannelFull')}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden lg:inline">{t('common.discordChannel')}</span>
                  </a>
                  <a
                    href="mailto:fasteddierrr@gmail.com"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="fasteddierrr@gmail.com"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden lg:inline">fasteddierrr@gmail.com</span>
                  </a>
                  <div className="h-4 w-px bg-border mx-1" />
                </>
              )}
              <div className="text-sm text-muted-foreground">
                {session?.user?.name}
                {session?.user?.role && (
                  <span className="ml-2 text-xs opacity-70">
                    ({session.user.role.toLowerCase()})
                  </span>
                )}
              </div>
              <LanguageToggle />
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
