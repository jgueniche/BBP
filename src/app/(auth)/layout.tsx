export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      {children}
    </div>
  );
}
