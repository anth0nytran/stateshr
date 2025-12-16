"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const items = [
  { href: "/scan", label: "Scan", Icon: QrCode },
  { href: "/leads", label: "Leads", Icon: Users },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 px-6 pointer-events-none">
      <nav className="pointer-events-auto mx-auto flex max-w-[280px] items-center justify-around rounded-full border bg-background/80 px-2 py-2 shadow-lg backdrop-blur-lg ring-1 ring-black/5 dark:ring-white/10">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/20"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* Patriotic Red Accent for Active State */}
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#ce1126] ring-2 ring-background"
                />
              )}
              
              <Icon className={cn("h-5 w-5 transition-transform duration-300")} />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
      </div>
  );
}
