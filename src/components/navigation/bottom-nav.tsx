import Link from 'next/link';

const items = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Group' },
  { href: '/insights', label: 'Insights' },
];

export function BottomNav() {
  return (
    <nav className="grid grid-cols-4 gap-2 border-t border-stone-700 bg-black/35 px-4 py-3">
      {items.map((item) => (
        <Link
          className="text-center text-xs text-stone-200"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
