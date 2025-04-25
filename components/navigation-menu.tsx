"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { HomeIcon, HistoryIcon, CameraIcon, UserIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: HomeIcon,
  },
  {
    title: "Scan",
    href: "/scan",
    icon: CameraIcon,
  },
  {
    title: "History",
    href: "/history",
    icon: HistoryIcon,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: UserIcon,
  },
];

interface NavigationMenuProps {
  className?: string;
}

export function NavigationMenu({ className }: NavigationMenuProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-2", className)}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link key={item.href} href={item.href} className="block">
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start font-medium",
                isActive 
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <Icon className="mr-2 h-5 w-5" />
              {item.title}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}