"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const items = [
  { href: "/scan", label: "Scan", Icon: Camera, kind: "primary" as const },
  { href: "/leads", label: "Leads", Icon: Users, kind: "secondary" as const },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const isScan = pathname === "/scan" || pathname?.startsWith("/scan/");
  const isLeads = pathname === "/leads" || pathname?.startsWith("/leads/");

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 px-6 pointer-events-none">
      <nav className="pointer-events-auto mx-auto flex max-w-[320px] items-center justify-between gap-3 rounded-full border bg-background/80 px-3 py-2 shadow-lg backdrop-blur-lg ring-1 ring-black/5 dark:ring-white/10">
        {/* Primary action (Scan) */}
        <Link
          href="/scan"
          aria-current={isScan ? "page" : undefined}
          className={cn(
            "group relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
            isScan
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-primary/10 text-primary hover:bg-primary/15"
          )}
          title="Scan a business card"
        >
          <Camera className="h-5 w-5" />
          <span>Scan</span>
          {/* Red accent dot for active */}
          {isScan && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#ce1126] ring-2 ring-background"
            />
          )}
        </Link>

        {/* Secondary action (Leads) */}
        <Link
          href="/leads"
          aria-current={isLeads ? "page" : undefined}
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
            isLeads ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          title="View pipeline leads"
        >
          {isLeads && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/20"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {isLeads && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#ce1126] ring-2 ring-background"
            />
          )}
          <Users className="h-5 w-5" />
          <span className="sr-only">Leads</span>
        </Link>
      </nav>
      </div>
  );
}
