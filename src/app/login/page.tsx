export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const hasError = typeof params.error === "string";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action="/api/auth/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">The Book</h1>
          <p className="mt-1 text-sm text-neutral-400">Your career archive. Sign in to continue.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-neutral-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoFocus
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-neutral-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
          />
        </div>
        {hasError && <p className="text-sm text-red-400">Wrong email or password. Try again.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 hover:bg-white"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
