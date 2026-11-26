import { PORTAL_VIEWS, portalUrl, type PortalId } from './portalRouter';

export default function PortalNav({
  id,
  view,
  navigateTab,
}: {
  id: PortalId;
  view: string;
  navigateTab?: (url: string, title?: string) => void;
}) {
  return (
    <nav className="vn-portal-nav" aria-label="Portal sections">
      {PORTAL_VIEWS[id].map(item => (
        <button
          key={item.id}
          type="button"
          aria-current={view === item.id ? 'page' : undefined}
          onClick={() => navigateTab?.(portalUrl(id, item.id))}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}