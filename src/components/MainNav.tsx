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
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    title: "История матчей",
    href: "/matches",
  },
];

const downloadsNavItem = {
  title: "Загрузки",
  href: "/downloads",
};

export function MainNav() {
  const pathname = usePathname();
  const version = getVersion();
  
  // Показываем вкладку "Загрузки" только для версии bogdan
  const navItems = version === 'bogdan' 
    ? [...baseNavItems, downloadsNavItem]
    : baseNavItems;

  return (
    <NavigationMenu className="mx-6">
      <NavigationMenuList>
        {navItems.map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.title}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
