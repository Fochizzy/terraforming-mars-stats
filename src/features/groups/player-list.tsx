type PlayerListProps = {
  players: Array<{
    id: string;
    display_name: string;
    linked_user_id?: string | null;
  }>;
};

export function PlayerList({ players }: PlayerListProps) {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">
        Recurring Player Profiles
      </h2>
      <p className="mt-2 text-sm text-stone-300">
        Add shared player records, link signed-in users when needed, and keep
        the group roster consistent between games.
      </p>
      <ul className="mt-4 grid gap-2">
        {players.map((player) => (
          <li
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-sm text-stone-200"
            key={player.id}
          >
            {player.display_name}
          </li>
        ))}
      </ul>
    </section>
  );
}
