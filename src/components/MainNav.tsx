"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { getVersion } from "@/lib/version";
import { useI18n } from "@/lib/i18n/context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MainNav() {
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
    <NavigationMenu className="mx-6">
      <NavigationMenuList>
        {navItems.map((item) => (
          <NavigationMenuItem key={item.href}>
            <NavigationMenuLink asChild>
              <Link
                href={item.href}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.title}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
