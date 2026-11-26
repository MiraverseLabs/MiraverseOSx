import React from 'react';
import { Compass } from 'lucide-react';
import { BROWSER_HOME } from './browserModel';

export type Navigate = (url: string, title?: string) => void;
export type VerseNetPage = 'discover' | 'directory' | 'culture' | 'reading' | 'search';

const destinations = [
  ['discover', '', 'Discover'],
  ['directory', '/directory', 'Directory'],
  ['culture', '/culture', 'Arts and culture'],
  ['reading', '/reading', 'Reading'],
] as const;

export function VerseNetLink({ url, navigate, openTab, children, className, current }: {
  url: string;
  navigate: Navigate;
  openTab?: Navigate;
  children: React.ReactNode;
  className?: string;
  current?: boolean;
}) {
  return <a href={url} className={className} aria-current={current ? 'page' : undefined}
    onClick={event => {
      event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && openTab) openTab(url);
      else navigate(url);
    }}>{children}</a>;
}

export function VerseNetNavigation({ page, navigate, openTab }: {
  page: VerseNetPage;
  navigate: Navigate;
  openTab?: Navigate;
}) {
  return <header className="vn-masthead">
    <VerseNetLink url={BROWSER_HOME} navigate={navigate} openTab={openTab} className="vn-masthead-brand">
      <Compass size={25} strokeWidth={1.5} aria-hidden="true" /> VerseNet
    </VerseNetLink>
    <nav aria-label="VerseNet pages">
      {destinations.map(([id, path, label]) => <VerseNetLink key={id} url={BROWSER_HOME + path}
        navigate={navigate} openTab={openTab} current={page === id}>{label}</VerseNetLink>)}
    </nav>
  </header>;
}
