import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "States HR",
  description: "Modern CRM & Lead Management",
  applicationName: "States HR",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "States HR" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // App-like feel
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background antialiased selection:bg-primary/20 selection:text-primary`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
          <div className="flex min-h-dvh flex-col pb-24">
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
              <div className="mx-auto flex h-20 max-w-2xl items-center justify-between px-6 lg:max-w-6xl">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src="/stateshrlogo.png"
                      alt="SHRCORP Logo"
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    <span className="text-[#ce1126]">SHR</span><span className="text-[#00234B] dark:text-white">CORP</span>
                  </span>
                </div>
                <ModeToggle />
              </div>
            </header>
            
            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 lg:max-w-6xl">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
            </main>
            
          <MobileNav />
        </div>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
