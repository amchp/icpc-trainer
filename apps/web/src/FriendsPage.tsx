import { FriendsRoster } from "./FriendsRoster.js";

export function FriendsPage(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
          <p className="mt-1 text-sm text-zinc-500">Track handles used to find contests</p>
        </div>
      </section>

      <FriendsRoster />
    </main>
  );
}
