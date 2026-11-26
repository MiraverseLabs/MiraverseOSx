// Presentation-only content for the three community sites. Gameplay (profiles,
// drafts, submissions, revisions, withdrawal) stays in interactiveSites.ts.
export interface CommunityFeature {
  id: string;
  title: string;
  meta?: string;
  body: string;
}

export interface CommunityFeatureSet {
  kicker: string;
  heading: string;
  badge: string;
  features: CommunityFeature[];
  note: string;
}

export const COMMUNITY_FEATURES: Record<string, CommunityFeatureSet> = {
  companion: {
    kicker: 'NEIGHBORHOOD / WALKING LOOPS',
    heading: 'Shared routes & companion etiquette',
    badge: 'NEIGHBORHOOD DESK',
    features: [
      { id: 'canal', title: 'Glassline Canal Path', meta: 'Loop · 2.4 km', body: 'A shaded waterside loop with water stations and a shaded rest at the lock.' },
      { id: 'elm', title: 'Dawnson Elm Green', meta: 'Green · 1.1 km', body: 'Off-lead hours are posted at the gate; the north lawn stays a quiet zone.' },
      { id: 'lantern', title: 'Lantern Alley', meta: 'Evening · 800 m', body: 'A lit evening route; keep companions close and carry a light after dusk.' },
    ],
    note: 'Routes are community notes, not bookings. The companion desk records enquiries only.',
  },
  garden: {
    kicker: 'GLASSLINE / CONSERVATORY BEDS',
    heading: 'Seasonal bed notes',
    badge: 'VISITOR COPY',
    features: [
      { id: 'mist', title: 'East Mist House', meta: 'Morning · humid', body: 'Ferns and moss beds; the mist cycle runs at opening and late afternoon.' },
      { id: 'medicinal', title: 'Medicinal Terrace', meta: 'Midday · bright', body: 'Raised herb beds with public labels; sketch from the gravel path.' },
      { id: 'moonbed', title: 'Moonbed', meta: 'Evening · low light', body: 'Night-blooming beds; the path stays open until the lamps are lit.' },
    ],
    note: 'Visits are preference requests; a place is not reserved.',
  },
  reading: {
    kicker: 'OPEN COLLECTIONS / CALL NUMBERS',
    heading: 'Card-catalog drawers',
    badge: 'OPEN READER · PUBLIC COLLECTIONS',
    features: [
      { id: 'ory', title: 'ORY-100', meta: 'Local history', body: 'Aureline street histories, ward maps, and the Glassline canal record.' },
      { id: 'civ', title: 'CIV-200', meta: 'City services', body: 'Public works, transit, and the civic registry reading copies.' },
      { id: 'tec', title: 'TEC-400', meta: 'Technology', body: 'Signal, relay, and public computing notes from the open shelves.' },
    ],
    note: 'Requests concern open collections and do not grant sealed archives.',
  },
};