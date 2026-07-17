import Link from 'next/link';
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { matchGlossaryTerms } from './glossary-matching';
import { GlossaryLink } from './glossary-link';

type GlossaryRichTextProps = {
  children: ReactNode;
  contextEntrySlug?: string;
  maxLinks?: number;
};

type RenderSession = {
  linkedSlugs: Set<string>;
  maxLinks: number;
  contextEntrySlug?: string;
  key: number;
};

const excludedIntrinsicElements = new Set([
  'a',
  'button',
  'code',
  'input',
  'option',
  'pre',
  'select',
  'textarea',
]);

function shouldExcludeElement(element: ReactElement) {
  const props = element.props as {
    contentEditable?: unknown;
    onChange?: unknown;
    onClick?: unknown;
    role?: unknown;
  };
  if (
    props.contentEditable ||
    props.onChange ||
    props.onClick ||
    props.role === 'button' ||
    props.role === 'textbox'
  ) {
    return true;
  }

  if (element.type === Link) {
    return true;
  }

  return (
    typeof element.type === 'string' &&
    excludedIntrinsicElements.has(element.type)
  );
}

function renderText(value: string, session: RenderSession): ReactNode[] {
  return matchGlossaryTerms(value, {
    excludedSlugs: session.contextEntrySlug ? [session.contextEntrySlug] : [],
    linkedSlugs: session.linkedSlugs,
    maxLinks: session.maxLinks,
  }).map((part) => {
    if (part.kind === 'text') {
      return part.value;
    }

    session.key += 1;
    return (
      <GlossaryLink key={`glossary-link-${session.key}`} slug={part.target.slug}>
        {part.value}
      </GlossaryLink>
    );
  });
}

function renderNode(node: ReactNode, session: RenderSession): ReactNode {
  if (Array.isArray(node)) {
    return node.map((child) => renderNode(child, session));
  }

  if (typeof node === 'string') {
    return renderText(node, session);
  }

  if (!isValidElement(node) || shouldExcludeElement(node)) {
    return node;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.props.children === undefined) {
    return element;
  }

  return cloneElement(
    element,
    undefined,
    renderNode(element.props.children, session),
  );
}

export function GlossaryRichText({
  children,
  contextEntrySlug,
  maxLinks = 6,
}: GlossaryRichTextProps) {
  return renderNode(children, {
    contextEntrySlug,
    key: 0,
    linkedSlugs: new Set<string>(),
    maxLinks,
  });
}
