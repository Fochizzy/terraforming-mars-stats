import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildAssetFallback,
  resolveCorporationLogoAsset,
  resolveScoreSourceAsset,
} from '@/lib/assets';
import { AssetImage } from './asset-image';

const supabaseUrl = 'https://example.supabase.co';

describe('AssetImage', () => {
  it('renders informative alt text and a loading state in reserved space', async () => {
    const asset = resolveCorporationLogoAsset(
      {
        corporationId: 'official:credicor',
        logoPath: 'CrediCor.png',
        name: 'CrediCor',
      },
      { supabaseUrl },
    );
    const { container } = render(
      <AssetImage asset={asset} height={80} width={80} />,
    );

    const image = screen.getByRole('img', { name: 'CrediCor logo' });
    const wrapper = container.querySelector('[data-asset-family]');
    expect(image).toHaveAttribute('alt', 'CrediCor logo');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading CrediCor image',
    );
    expect(wrapper).toHaveStyle({ height: '80px', width: '80px' });
    expect(wrapper).not.toHaveAttribute('tabindex');

    fireEvent.load(image);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(wrapper).toHaveAttribute('data-asset-status', 'ready');
    });
  });

  it('keeps decorative images and their loading treatment out of the accessibility tree', () => {
    const asset = resolveScoreSourceAsset('tr', {
      decorative: true,
      supabaseUrl,
    });
    const { container } = render(
      <AssetImage asset={asset} height={40} width={40} />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders an accessible deterministic fallback when metadata is missing', () => {
    const fallback = buildAssetFallback(
      'corporation-logo',
      'A Corporation With An Exceptionally Long Name',
    );
    const { container } = render(
      <AssetImage
        asset={null}
        fallback={fallback}
        family="corporation-logo"
        height={64}
        width={64}
      />,
    );

    const fallbackImage = screen.getByRole('img', {
      name: 'A Corporation With An Exceptionally Long Name image unavailable',
    });
    expect(fallbackImage).toHaveTextContent('AC');
    expect(fallbackImage).toHaveAttribute(
      'title',
      'A Corporation With An Exceptionally Long Name image unavailable',
    );
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('[data-asset-status]')).toHaveAttribute(
      'data-asset-status',
      'fallback',
    );
  });

  it('removes a failed image and swaps once to the textual fallback', () => {
    const asset = resolveCorporationLogoAsset(
      {
        corporationId: 'community:broken-corp',
        logoPath: 'Broken.png',
        name: 'Broken Corp',
      },
      { supabaseUrl },
    );
    const { container } = render(
      <AssetImage asset={asset} height={48} width={48} />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Broken Corp logo' }));

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Broken Corp image unavailable' }),
    ).toHaveTextContent('BC');
  });

  it('uses explicit dimensions or an aspect-ratio container without inventing intrinsic metadata', () => {
    const asset = resolveScoreSourceAsset('animal', { supabaseUrl });
    const { container, rerender } = render(
      <AssetImage asset={asset} aspectRatio={1.5} width="50%" />,
    );
    const wrapper = container.querySelector('[data-asset-family]');

    expect(wrapper).toHaveStyle({ aspectRatio: '1.5', width: '50%' });

    rerender(<AssetImage asset={asset} height={32} width={48} />);

    expect(wrapper).toHaveStyle({ height: '32px', width: '48px' });
    expect(wrapper).not.toHaveStyle({ aspectRatio: '1.5' });
  });

  it('keeps an unavailable decorative fallback noninteractive and silent', () => {
    const { container } = render(
      <AssetImage asset={null} decorative height={32} width={32} />,
    );
    const wrapper = container.querySelector('[data-asset-family]');
    const fallback = wrapper?.firstElementChild;

    expect(fallback).toHaveAttribute('aria-hidden', 'true');
    expect(fallback).not.toHaveAttribute('role');
    expect(wrapper).not.toHaveAttribute('tabindex');
  });
});
