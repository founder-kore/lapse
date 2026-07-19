import { db } from "@/lib/db";
import { AppNav } from "@/components/sidebar";
import { Toaster } from "@/components/toast";

// The nav badge shows live open-finding counts, so this shell renders
// per-request (all pages in this group are force-dynamic anyway).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [noResponse, assetsOut] = await Promise.all([
    db.contractor.count({ where: { status: "EXPIRED_NO_RESPONSE" } }),
    db.contractor.count({ where: { status: "ENDED", assetReturned: false } }),
  ]);

  return (
    <div className="min-h-screen">
      <AppNav exceptionsCount={noResponse + assetsOut} />
      <div className="lg:pl-60">{children}</div>
      <Toaster />
    </div>
  );
}
