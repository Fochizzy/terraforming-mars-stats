import Image from 'next/image';

const previewCards = [
  {
    id: 'merger',
    cardNumber: 'P39',
    name: 'Merger',
    type: 'Event',
    thumbnailUrl: '/promo-thumb-merger.png',
    fullImageUrl: '/promo-full-merger.png',
  },
];

export function PromoSetBrowser() {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">Promo Sets</h2>
      <div className="mt-4 grid gap-3">
        {previewCards.map((card) => (
          <a
            className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-stone-700 bg-stone-950/60 p-3"
            href={card.fullImageUrl}
            key={card.id}
          >
            <Image
              alt={`${card.name} thumbnail`}
              className="h-[96px] w-[72px] rounded-md object-cover"
              src={card.thumbnailUrl}
              height={96}
              width={72}
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
                {card.cardNumber}
              </p>
              <h3 className="font-semibold text-stone-100">{card.name}</h3>
              <p className="text-sm text-stone-300">{card.type}</p>
              <span className="text-xs text-cyan-200">Open full image</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
