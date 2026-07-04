import Link from 'next/link';

const items = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Group' },
  { href: '/insights', label: 'Insights' },
];

export function BottomNav() {
  return (
    <nav className="tm-bottom-nav">
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
