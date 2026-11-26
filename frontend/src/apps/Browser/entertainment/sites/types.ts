import type { EntertainmentSiteMeta, ResolvedEntertainmentRoute } from '../entertainmentRouter';
import type { CanonicalEntertainmentOrg, EntertainmentPortalData } from '../services/entertainmentDataService';

export interface SiteComponentProps {
  site: EntertainmentSiteMeta;
  org: CanonicalEntertainmentOrg;
  resolved: ResolvedEntertainmentRoute;
  data: EntertainmentPortalData;
  navigate: (url: string) => void;
}
