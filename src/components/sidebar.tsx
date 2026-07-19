"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hourglass,
  LayoutDashboard,
  Mail,
  Menu,
  ShieldAlert,
  X,
  type LucideIcon,
} from "lucide-react";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exceptions", label: "Exceptions", icon: ShieldAlert },
  { href: "/emails", label: "Emails", icon: Mail },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-md bg-indigo-600 shadow-sm">
        <Hourglass size={15} className="text-white" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-zinc-900">
          Lapse
        </span>
        {!compact ? (
          <span className="block text-[11px] leading-3 text-zinc-600">
            Contractor expiry watch
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function NavLinks({
  pathname,
  exceptionsCount,
}: {
  pathname: string;
  exceptionsCount: number;
}) {
  return (
    <nav className="flex-1 space-y-0.5 px-3">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const showCount = href === "/exceptions" && exceptionsCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150 ${
              active
                ? "bg-indigo-50 font-medium text-indigo-700"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <Icon
              size={16}
              className={`transition-colors duration-150 ${
                active
                  ? "text-indigo-600"
                  : "text-zinc-500 group-hover:text-zinc-700"
              }`}
              aria-hidden
            />
            <span className="flex-1">{label}</span>
            {showCount ? (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-red-700">
                {exceptionsCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function FooterNote() {
  return (
    <div className="border-t border-zinc-200 px-5 py-4">
      <p className="text-[11px] leading-4 text-zinc-600">
        Demo workspace — emails are rendered to the outbox, nothing is sent.
      </p>
    </div>
  );
}

/**
 * App navigation. Desktop (lg+): fixed left sidebar. Below lg: a sticky top
 * bar with a hamburger that opens a slide-in drawer carrying the same links.
 */
export function AppNav({ exceptionsCount }: { exceptionsCount: number }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open; restore on close/unmount.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Brand />
        </div>
        <NavLinks pathname={pathname} exceptionsCount={exceptionsCount} />
        <FooterNote />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand compact />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="relative -m-1 rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Menu size={19} aria-hidden />
          {exceptionsCount > 0 ? (
            <span
              aria-hidden
              className="absolute right-1 top-1 size-2 rounded-full bg-red-600 ring-2 ring-white"
            />
          ) : null}
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-fade absolute inset-0 bg-zinc-900/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Navigation"
            className="animate-drawer absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between px-5 pb-5 pt-6">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="-m-1 rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <NavLinks pathname={pathname} exceptionsCount={exceptionsCount} />
            <FooterNote />
          </div>
        </div>
      ) : null}
    </>
  );
}
