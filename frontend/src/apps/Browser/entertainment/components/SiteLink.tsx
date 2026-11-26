import type { CSSProperties, MouseEvent, ReactNode } from 'react';

export interface SiteLinkProps {
  href: string;
  navigate: (url: string) => void;
  children: ReactNode;
  current?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  id?: string;
}

export function SiteLink({ href, navigate, children, current, className, style, ariaLabel, id }: SiteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(href);
  }

  return (
    <a
      id={id}
      href={href}
      onClick={handleClick}
      aria-current={current ? 'page' : undefined}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
