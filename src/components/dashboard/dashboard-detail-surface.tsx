'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  DataStateRenderer,
  SectionHeader,
  type DataDisplayState,
} from '@/components/foundations';

export type DashboardDetailMode = 'panel' | 'modal' | 'responsive';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useResolvedMode(mode: DashboardDetailMode) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (mode !== 'responsive' || typeof window.matchMedia !== 'function') {
      setMobile(false);
      return;
    }
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, [mode]);

  return mode === 'responsive' ? (mobile ? 'modal' : 'panel') : mode;
}

export function DashboardDetailSurface({
  open,
  title,
  description,
  mode = 'responsive',
  state,
  onClose,
  onClear,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  mode?: DashboardDetailMode;
  state?: DataDisplayState;
  onClose: () => void;
  onClear?: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedMode = useResolvedMode(mode);

  useEffect(() => {
    if (!open || resolvedMode !== 'modal') {
      return;
    }
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();
    return () => {
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
    };
  }, [open, resolvedMode]);

  if (!open) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || resolvedMode !== 'modal') {
      return;
    }
    const focusable = Array.from(
      surfaceRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {onClear ? (
        <button
          className="tm-button-secondary tm-focus-ring min-h-11"
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
      ) : null}
      <button
        aria-label={`Close ${title}`}
        className="tm-button-secondary tm-focus-ring min-h-11"
        onClick={onClose}
        ref={closeButtonRef}
        type="button"
      >
        Close
      </button>
    </div>
  );
  const surface = (
    <div
      aria-labelledby={titleId}
      aria-modal={resolvedMode === 'modal' ? 'true' : undefined}
      className={
        resolvedMode === 'modal'
          ? 'tm-dashboard-detail-surface tm-dashboard-detail-modal'
          : 'tm-dashboard-detail-surface tm-panel'
      }
      onKeyDown={handleKeyDown}
      ref={surfaceRef}
      role={resolvedMode === 'modal' ? 'dialog' : 'region'}
    >
      <SectionHeader
        actions={headerActions}
        description={description}
        headingLevel={2}
        title={title}
        titleId={titleId}
      />
      <div className="mt-4">
        <DataStateRenderer state={state}>{children}</DataStateRenderer>
      </div>
    </div>
  );

  return resolvedMode === 'modal' ? (
    <div className="tm-dashboard-detail-backdrop">{surface}</div>
  ) : (
    surface
  );
}
