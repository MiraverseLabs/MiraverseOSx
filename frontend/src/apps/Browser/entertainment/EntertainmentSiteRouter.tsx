import { useMemo } from 'react';
import { resolveEntertainmentRoute } from './entertainmentRouter';
import { useEntertainmentPortalData } from './services/entertainmentDataService';
import { ENTERTAINMENT_SITE_REGISTRY } from './sites/registry';
import './styles/entertainment-base.css';
import './styles/wave1-sites.css';
import './styles/wave2-sites.css';
import './styles/wave3-sites.css';

interface EntertainmentSiteRouterProps {
  url: string;
  navigateTab: (url: string) => void;
}

export default function EntertainmentSiteRouter({ url, navigateTab }: EntertainmentSiteRouterProps) {
  const resolved = useMemo(() => resolveEntertainmentRoute(url), [url]);

  if (!resolved) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold">Entertainment portal unavailable.</p>
      </div>
    );
  }

  return <ResolvedEntertainmentSite resolved={resolved} navigateTab={navigateTab} />;
}

function ResolvedEntertainmentSite({
  resolved,
  navigateTab,
}: {
  resolved: NonNullable<ReturnType<typeof resolveEntertainmentRoute>>;
  navigateTab: (url: string) => void;
}) {
  const data = useEntertainmentPortalData(resolved.site);
  const SiteComponent = ENTERTAINMENT_SITE_REGISTRY[resolved.site.orgId];

  if (!data.org || !SiteComponent) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold">Entertainment portal unavailable for {resolved.site.name}.</p>
      </div>
    );
  }

  return (
    <SiteComponent
      site={resolved.site}
      org={data.org}
      resolved={resolved}
      data={data}
      navigate={navigateTab}
    />
  );
}
