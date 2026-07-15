import Link from 'next/link';

const items = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Group' },
  { href: '/insights', label: 'Insights' },
  { href: '/cards', label: 'Cards' },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Bottom navigation"
      className="tm-bottom-nav sticky bottom-0 z-30 grid-cols-5"
    >
      {items.map((item) => (
        <Link
          className="tm-bottom-nav__link"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
