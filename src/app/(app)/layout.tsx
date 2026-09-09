import Link from "next/link";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            The Book
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-300">
            <Link href="/" className="hover:text-white">
              Archive
            </Link>
            <Link href="/accounts" className="hover:text-white">
              Accounts
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-neutral-500 hover:text-white">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
