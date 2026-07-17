'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * Accessible tooltip primitives (no external dependency).
 *
 * The tooltip content stays in the DOM (visually hidden) so the trigger's
 * `aria-describedby` always resolves. It shows on hover and keyboard focus
 * and hides on blur, mouse leave, or Escape, following the WAI-ARIA tooltip
 * pattern. Content is supplementary text only — never put controls inside.
 */

export type TooltipPlacement = 'top' | 'bottom';

function useTooltipState() {
  const [visible, setVisible] = useState(false);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      setVisible(false);
    }
  };
  return { visible, show, hide, onKeyDown };
}

function TooltipBubble({
  id,
  visible,
  placement,
  content,
}: {
  id: string;
  visible: boolean;
  placement: TooltipPlacement;
  content: ReactNode;
}) {
  return (
    <span
      className={visible ? 'tm-tooltip tm-tooltip-visible' : 'tm-tooltip'}
      data-placement={placement}
      id={id}
      role="tooltip"
    >
      {content}
    </span>
  );
}

/**
 * Wraps an interactive child (button, link, input) and describes it with the
 * tooltip content. The child must be focusable; the tooltip opens on the
 * child's focus and hover. For plain informational hints beside text, use
 * `InfoTooltip`, which renders its own focusable trigger.
 */
export function Tooltip({
  content,
  placement = 'top',
  children,
}: {
  content: ReactNode;
  placement?: TooltipPlacement;
  children: ReactElement<{ 'aria-describedby'?: string }>;
}) {
  const tooltipId = useId();
  const { visible, show, hide, onKeyDown } = useTooltipState();

  const trigger = isValidElement(children)
    ? cloneElement(children, { 'aria-describedby': tooltipId })
    : children;

  return (
    <span
      className="tm-tooltip-anchor"
      onBlur={hide}
      onFocus={show}
      onKeyDown={onKeyDown}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {trigger}
      <TooltipBubble
        content={content}
        id={tooltipId}
        placement={placement}
        visible={visible}
      />
    </span>
  );
}

/**
 * A small "i" button that reveals supplementary text on hover or focus.
 * Intended for metric definitions and methodology notes beside labels.
 */
export function InfoTooltip({
  content,
  label = 'More information',
  placement = 'top',
}: {
  content: ReactNode;
  /** Accessible name of the trigger button. */
  label?: string;
  placement?: TooltipPlacement;
}) {
  const tooltipId = useId();
  const { visible, show, hide, onKeyDown } = useTooltipState();

  return (
    <span
      className="tm-tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        aria-describedby={tooltipId}
        aria-label={label}
        className="tm-info-tooltip-button tm-focus-ring"
        onBlur={hide}
        onFocus={show}
        onKeyDown={onKeyDown}
        type="button"
      >
        <span aria-hidden="true">i</span>
      </button>
      <TooltipBubble
        content={content}
        id={tooltipId}
        placement={placement}
        visible={visible}
      />
    </span>
  );
}
