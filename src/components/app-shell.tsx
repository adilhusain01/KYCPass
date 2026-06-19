"use client";

import {
  Activity,
  BadgeCheck,
  BookOpenText,
  FileKey2,
  Fingerprint,
  Landmark,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflow-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/onboarding", label: "Onboarding", icon: Fingerprint },
  { href: "/northstar", label: "Platform demo", icon: Landmark },
  { href: "/docs", label: "Docs", icon: BookOpenText },
  { href: "/credentials", label: "Credentials", icon: BadgeCheck },
  { href: "/audit", label: "Audit", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const did = useWorkflowStore((state) => state.userDid);

  if (pathname.startsWith("/northstar")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-[#fff8e7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <span className="grid size-11 place-items-center border-2 border-black bg-[#b8ff2c] shadow-[4px_4px_0_#111]">
              <FileKey2 className="size-6" strokeWidth={2.5} />
            </span>
            <span>
              <span className="display-type block text-2xl font-extrabold leading-none">
                KYCPass
              </span>
              <span className="code-type hidden text-[10px] uppercase tracking-[0.16em] sm:block">
                Prove the claim. Keep the document.
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-2 border-2 px-3 text-sm font-bold transition-transform",
                    active
                      ? "border-black bg-[#1f5eff] text-white shadow-[3px_3px_0_#111]"
                      : "border-transparent hover:border-black hover:bg-white",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden border-2 border-black bg-white px-3 py-2 font-mono text-[10px] uppercase md:block">
              {did ? `${did.slice(0, 18)}...` : "Wallet not connected"}
            </div>
            <Button
              variant="neutral"
              size="icon"
              className="lg:hidden"
              aria-label="Toggle navigation"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open ? (
          <nav
            id="mobile-navigation"
            className="grid border-t-2 border-black bg-white p-3 lg:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-12 items-center gap-3 border-2 border-transparent px-3 font-bold",
                  pathname === item.href && "border-black bg-[#b8ff2c]",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main>{children}</main>
      <footer className="mt-20 border-t-2 border-black bg-black px-4 py-8 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-5 md:flex-row md:items-center">
          <p className="display-type text-2xl font-bold">
            Identity without data sprawl.
          </p>
          <div className="code-type text-xs uppercase tracking-[0.16em] text-white/70">
            T3N / WASM / METAMASK / NEXT.JS
          </div>
        </div>
      </footer>
    </div>
  );
}
