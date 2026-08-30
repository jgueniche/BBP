import { BottomNav } from "@/components/ui/bottom-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <main className="px-4 pb-28 pt-8">{children}</main>
      <BottomNav />
    </div>
  );
}
