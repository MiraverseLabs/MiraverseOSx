export type HomeFeed =
  | 'roster' | 'models' | 'releases' | 'tracks' | 'scores'
  | 'events' | 'auditions' | 'projects' | 'campaigns' | 'stories' | 'honors'
  | 'artwork' | 'services' | 'atelier';

export interface HomeDesign {
  composition: string;
  palette: readonly [paper: string, ink: string, action: string];
  typeface: 'serif' | 'sans' | 'mono' | 'display' | 'heritage';
  action: string;
  feature?: { src: string; alt: string; placement: 'campaign' | 'lead' | 'services' };
  sections: readonly [lead: HomeSection, companion: HomeSection];
}

interface HomeSection {
  title: string;
  feed: HomeFeed;
  view: 'list' | 'grid' | 'ledger' | 'gallery' | 'feature';
}

// Every composition describes the real public face of the organization. The
// existing site tabs continue to own playable controls and private workspaces.
export const entertainmentHomeDesigns = {
  ORG_STARSTRUCK: {
    composition: 'showcase', palette: ['#25132d', '#fff3fc', '#84346e'], typeface: 'display',
    action: 'Explore representation',
    feature: { src: '/media/albums/album-neon-starlight.jpg', alt: 'Neon-lit portrait from Starstruck’s cover-art archive', placement: 'lead' },
    sections: [{ title: 'Featured talent', feed: 'roster', view: 'grid' }, { title: 'Showcase artwork', feed: 'artwork', view: 'gallery' }],
  },
  ORG_MARLIE_RECORDS: {
    composition: 'record-shop', palette: ['#f7eedb', '#252b25', '#245750'], typeface: 'serif',
    action: 'Explore label agreements',
    sections: [{ title: 'The catalog', feed: 'releases', view: 'grid' }, { title: 'From the sleeve archive', feed: 'artwork', view: 'gallery' }],
  },
  ORG_KAJI_PUBLISHING: {
    composition: 'score-desk', palette: ['#fff9ed', '#382d1f', '#74521e'], typeface: 'heritage',
    action: 'View publishing terms',
    feature: { src: '/media/albums/album-chamber-violin.jpg', alt: 'Chamber violin and score from the Kaji cover-art archive', placement: 'services' },
    sections: [{ title: 'Publishing catalog', feed: 'scores', view: 'ledger' }, { title: 'Studio services', feed: 'services', view: 'feature' }],
  },
  ORG_LUNERUM_DIST: {
    composition: 'release-desk', palette: ['#e9effa', '#172947', '#35477d'], typeface: 'mono',
    action: 'View distribution terms',
    sections: [{ title: 'Distributed releases', feed: 'releases', view: 'ledger' }, { title: 'Release administration', feed: 'services', view: 'feature' }],
  },
  ORG_SECOND_ACT: {
    composition: 'boutique', palette: ['#f9eee9', '#442828', '#75423d'], typeface: 'heritage',
    action: 'See management terms',
    sections: [{ title: 'The roster', feed: 'roster', view: 'list' }, { title: 'Representation', feed: 'services', view: 'feature' }],
  },
  ORG_POP_STICKER: {
    composition: 'station', palette: ['#3c1649', '#fff1fb', '#954171'], typeface: 'display',
    action: 'Open the request desk',
    sections: [{ title: 'Station rotation', feed: 'tracks', view: 'grid' }, { title: 'From the station', feed: 'stories', view: 'list' }],
  },
  ORG_SONGBIRD: {
    composition: 'listening-room', palette: ['#0a2422', '#ecfff8', '#286354'], typeface: 'sans',
    action: 'Browse the music library',
    sections: [{ title: 'Listen on Songbird', feed: 'tracks', view: 'ledger' }, { title: 'Cover art', feed: 'artwork', view: 'gallery' }],
  },
  ORG_LIMELIGHT: {
    composition: 'magazine', palette: ['#fff8f0', '#30212c', '#803558'], typeface: 'display',
    action: 'Read the magazine',
    feature: { src: '/media/albums/album-amber-silhouette.jpg', alt: 'An artist’s silhouette against warm amber stage light', placement: 'lead' },
    sections: [{ title: 'From the magazine', feed: 'stories', view: 'feature' }, { title: 'The press desk', feed: 'services', view: 'list' }],
  },
  ORG_RADIANCE_AWARDS: {
    composition: 'awards-program', palette: ['#231b13', '#fff2ce', '#775425'], typeface: 'heritage',
    action: 'Open the awards program',
    sections: [{ title: 'Categories and honors', feed: 'honors', view: 'ledger' }, { title: 'Academy artwork', feed: 'artwork', view: 'gallery' }],
  },
  ORG_GLASSLINE_DESIGNS: {
    composition: 'runway', palette: ['#fcf0f2', '#361d2c', '#85405a'], typeface: 'serif',
    action: 'Open the design atelier',
    feature: { src: '/media/entertainment/glassline-atelier.jpg', alt: 'A mauve organza stage gown in motion inside a glass theatre', placement: 'campaign' },
    sections: [{ title: 'Runway lookbook and atelier', feed: 'atelier', view: 'feature' }, { title: 'Runway and wardrobe calls', feed: 'auditions', view: 'list' }],
  },
  ORG_WILLOW_WHISPER: {
    composition: 'model-index', palette: ['#ecf2e6', '#253527', '#3a624b'], typeface: 'heritage',
    action: 'Explore modeling calls',
    feature: { src: '/media/entertainment/willow-editorial.jpg', alt: 'Three models in cream and charcoal tailoring in a glass conservatory', placement: 'campaign' },
    sections: [{ title: 'Model directory', feed: 'models', view: 'grid' }, { title: 'Casting notices', feed: 'auditions', view: 'list' }],
  },
  ORG_ROSEMONT_PORTRAIT: {
    composition: 'portrait-gallery', palette: ['#f7e9db', '#3b2322', '#7e483f'], typeface: 'serif',
    action: 'View portrait commissions',
    sections: [{ title: 'The portrait gallery', feed: 'artwork', view: 'gallery' }, { title: 'Studio sittings', feed: 'services', view: 'feature' }],
  },
  ORG_AMRIELLE: {
    composition: 'beauty-counter', palette: ['#f7e8ef', '#402436', '#87476c'], typeface: 'serif',
    action: 'Explore campaign opportunities',
    feature: { src: '/media/entertainment/amrielle-still-life.jpg', alt: 'Rose-toned perfume and stage cosmetics arranged on travertine', placement: 'campaign' },
    sections: [{ title: 'Beauty and fragrance', feed: 'services', view: 'feature' }, { title: 'Published campaigns', feed: 'campaigns', view: 'grid' }],
  },
  ORG_FEMME_FATALE: {
    composition: 'repertoire', palette: ['#31161e', '#fff0ef', '#9a3e53'], typeface: 'display',
    action: 'Explore performance opportunities',
    sections: [{ title: 'The company and repertoire', feed: 'projects', view: 'feature' }, { title: 'Company calls', feed: 'auditions', view: 'ledger' }],
  },
  ORG_WONDER_WIND: {
    composition: 'tour-journal', palette: ['#eef3ef', '#263c39', '#3a655f'], typeface: 'heritage',
    action: 'View collaborations',
    sections: [{ title: 'Touring and collaborations', feed: 'events', view: 'list' }, { title: 'From the tour archive', feed: 'artwork', view: 'gallery' }],
  },
  ORG_MIRRORA_STUDIOS: {
    composition: 'film-slate', palette: ['#172333', '#f5f4ff', '#4e5484'], typeface: 'sans',
    action: 'View studio casting',
    sections: [{ title: 'Production slate', feed: 'artwork', view: 'gallery' }, { title: 'Casting for the screen', feed: 'auditions', view: 'ledger' }],
  },
  ORG_STORYLOOM_STUDIOS: {
    composition: 'illustrated-catalog', palette: ['#fff3dd', '#383447', '#695078'], typeface: 'serif',
    action: 'Explore studio opportunities',
    sections: [{ title: 'Illustrated works', feed: 'artwork', view: 'gallery' }, { title: 'Released productions', feed: 'projects', view: 'list' }],
  },
  ORG_VELVET_CURTAIN: {
    composition: 'tour-itinerary', palette: ['#2c1929', '#fff0f7', '#85406e'], typeface: 'sans',
    action: 'Open touring and box office',
    sections: [{ title: 'Production itinerary', feed: 'events', view: 'ledger' }, { title: 'Tour artwork', feed: 'artwork', view: 'gallery' }],
  },
  ORG_SILVERLEAF_STADIUM: {
    composition: 'arena-calendar', palette: ['#142b3c', '#f0f9ff', '#315f7b'], typeface: 'sans',
    action: 'Open the box office',
    sections: [{ title: 'Stadium calendar', feed: 'events', view: 'grid' }, { title: 'Venue information', feed: 'services', view: 'feature' }],
  },
  ORG_LOOKING_GLASS: {
    composition: 'gig-board', palette: ['#252223', '#fff3d9', '#80513c'], typeface: 'mono',
    action: 'See gig tickets',
    sections: [{ title: 'The gig board', feed: 'events', view: 'list' }, { title: 'From the room', feed: 'services', view: 'feature' }],
  },
  ORG_MARIGOLD_THEATRE: {
    composition: 'playbill', palette: ['#fff1d4', '#45261f', '#7d4330'], typeface: 'display',
    action: 'Open theatre tickets',
    sections: [{ title: 'The season playbill', feed: 'events', view: 'feature' }, { title: 'Programme artwork', feed: 'artwork', view: 'gallery' }],
  },
  ORG_OPEN_CALL: {
    composition: 'casting-board', palette: ['#edf2fa', '#222c3b', '#38577f'], typeface: 'sans',
    action: 'Browse and apply to auditions',
    sections: [{ title: 'Open auditions', feed: 'auditions', view: 'ledger' }, { title: 'Production key art', feed: 'artwork', view: 'gallery' }],
  },
  ORG_WORD_OF_MOUTH: {
    composition: 'pressroom', palette: ['#fff5f3', '#38252a', '#8a3c4e'], typeface: 'sans',
    action: 'Open client services',
    sections: [{ title: 'Published statements', feed: 'stories', view: 'list' }, { title: 'Publicity services', feed: 'services', view: 'feature' }],
  },
  ORG_PERFORMERS_ASSOC: {
    composition: 'handbook', palette: ['#f6f1e5', '#2e3429', '#4f6241'], typeface: 'heritage',
    action: 'Open guild membership services',
    sections: [{ title: 'Member handbook', feed: 'services', view: 'feature' }, { title: 'Public association notices', feed: 'stories', view: 'list' }],
  },
  ORG_MUSIC_RIGHTS_SOCIETY: {
    composition: 'rights-register', palette: ['#ecf1f1', '#25373b', '#3a5e66'], typeface: 'mono',
    action: 'Open licensing and royalty services',
    sections: [{ title: 'Licensing and royalties', feed: 'services', view: 'feature' }, { title: 'Registered compositions', feed: 'scores', view: 'ledger' }],
  },
} as const satisfies Record<string, HomeDesign>;

