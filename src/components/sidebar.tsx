"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hourglass,
  LayoutDashboard,
  Mail,
  ShieldAlert,
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

/**
 * Persistent app sidebar. Greyscale chrome; the indigo accent marks the
 * active route, and the single red pill on Exceptions is the only severity
 * signal in the chrome — it counts open findings.
 */
export function Sidebar({ exceptionsCount }: { exceptionsCount: number }) {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col border-r border-zinc-200 bg-white">
      <Link href="/" className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex size-7 items-center justify-center rounded-md bg-indigo-600">
          <Hourglass size={15} className="text-white" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-zinc-900">
            Lapse
          </span>
          <span className="block text-[11px] leading-3 text-zinc-600">
            Contractor expiry watch
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 px-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const showCount = href === "/exceptions" && exceptionsCount > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon
                size={16}
                className={active ? "text-indigo-600" : "text-zinc-500"}
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

      <div className="border-t border-zinc-200 px-5 py-4">
        <p className="text-[11px] leading-4 text-zinc-600">
          Demo workspace — emails are rendered to the outbox, nothing is sent.
        </p>
      </div>
    </aside>
  );
}
