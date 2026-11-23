import { formatMailingAddress, type CanonicalMailingAddress } from '../data/meridionWorld';

export type ParcelStatus = 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered';
export type PostalItemKind = 'parcel' | 'letter' | 'postcard' | 'official_seal';

export interface TrackingEvent {
  at: string;
  location: string;
  status: ParcelStatus;
  note: string;
}

export interface PostalReward {
  credits?: number;
  xp?: number;
  itemName?: string;
}

export interface PostalShipment {
  id: string;
  trackingNumber: string;
  direction: 'incoming' | 'outgoing';
  kind: PostalItemKind;
  carrier: 'Meridion Post' | 'CargoTrack Express' | 'Royal Courier';
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  title: string;
  description: string;
  sealLabel?: string;
  paperBody?: string;
  status: ParcelStatus;
  opened: boolean;
  openedAt?: string;
  rewardClaimed?: boolean;
  rewards?: PostalReward;
  postagePaid?: number;
  events: TrackingEvent[];
  createdAt: string;
}

export const PLAYER_RESIDENTIAL_ADDRESS: CanonicalMailingAddress = {
  buildingNumberAndStreet: '42 Vector Crescent',
  buildingAndUnit: 'Vector House, Suite 4B',
  district: 'Sector 4',
  city: 'Aureline',
  realm: 'Orynvell',
  postalCode: 'OR-4012',
};

export const FORMATTED_PLAYER_ADDRESS = formatMailingAddress(PLAYER_RESIDENTIAL_ADDRESS);

export interface PostalAddressEntry {
  id: string;
  name: string;
  category: 'Academic' | 'Civic' | 'Commercial' | 'Personal';
  address: string;
  postalCode: string;
}

export const MERIDION_ADDRESS_BOOK: PostalAddressEntry[] = [
  {
    id: 'addr-cyberium',
    name: 'Cyberium Academy · Compiler Lab 4',
    category: 'Academic',
    address: '100 Academic Quadrangle, Sector 4, Aureline, Orynvell OR-4040, Meridion',
    postalCode: 'OR-4040',
  },
  {
    id: 'addr-dawn',
    name: 'Dawn University · Concord Reading Hall',
    category: 'Academic',
    address: '14 Dawn Court, Dawnson, Aureline, Orynvell OR-4210, Meridion',
    postalCode: 'OR-4210',
  },
  {
    id: 'addr-regent',
    name: 'Regent Hall · Warden & Empress Cloister',
    category: 'Academic',
    address: '1 Crown Terrace, Royal Precinct, Orynvell OR-1001, Meridion',
    postalCode: 'OR-1001',
  },
  {
    id: 'addr-faithmed',
    name: 'Faith Medical Group · Clinical Intake',
    category: 'Civic',
    address: '88 Lantern Boulevard, Sector 2, Aureline, Orynvell OR-2088, Meridion',
    postalCode: 'OR-2088',
  },
  {
    id: 'addr-archives',
    name: 'Royal Historic Archives · Vault Desk',
    category: 'Civic',
    address: '7 Charter Passage, Old Quarter, Orynvell OR-1044, Meridion',
    postalCode: 'OR-1044',
  },
  {
    id: 'addr-cargotrack',
    name: 'CargoTrack Logistics · Aureline Hub',
    category: 'Commercial',
    address: '305 Freight Causeway, Dockside, Aureline, Orynvell OR-3305, Meridion',
    postalCode: 'OR-3305',
  },
];

export const POSTAGE_RATES: Record<PostalItemKind, { label: string; cost: number; carrier: PostalShipment['carrier'] }> = {
  postcard: { label: 'Postcard', cost: 5, carrier: 'Meridion Post' },
  letter: { label: 'Sealed Paper Letter', cost: 12, carrier: 'Meridion Post' },
  parcel: { label: 'Standard Parcel', cost: 25, carrier: 'CargoTrack Express' },
  official_seal: { label: 'Registered Wax-Sealed Courier', cost: 40, carrier: 'Royal Courier' },
};

export function generateTrackingNumber(prefix: 'MP' | 'CT' | 'RC' = 'MP'): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-OR-${digits}`;
}

export function statusLabel(status: ParcelStatus): string {
  switch (status) {
    case 'label_created':
      return 'Label Created';
    case 'in_transit':
      return 'In Transit';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered to Suite 4B';
  }
}

export function nextParcelStatus(status: ParcelStatus): ParcelStatus {
  if (status === 'label_created') return 'in_transit';
  if (status === 'in_transit') return 'out_for_delivery';
  return 'delivered';
}

export function buildInitialShipments(): PostalShipment[] {
  return [
    {
      id: 'POST-INIT-1',
      trackingNumber: 'MP-OR-4012',
      direction: 'incoming',
      kind: 'parcel',
      carrier: 'Meridion Post',
      senderName: 'Vector House Residential Services',
      senderAddress: '40 Vector Crescent, Sector 4, Aureline, Orynvell OR-4010, Meridion',
      recipientName: 'Resident · Suite 4B',
      recipientAddress: FORMATTED_PLAYER_ADDRESS,
      title: 'Suite 4B Welcome Care Package',
      description: 'Physical residential welcome box containing your brass locker key, welcome stipend voucher, and Sector 4 street map.',
      status: 'delivered',
      opened: false,
      rewards: { credits: 50, xp: 20, itemName: 'Vector House Brass Locker Key' },
      createdAt: 'Cycle 28 · 08:10 AM',
      events: [
        { at: 'Cycle 28 · 07:15 AM', location: 'Aureline Central Sorting Hub (OR-4000)', status: 'in_transit', note: 'Parcel scanned and routed to Sector 4 courier.' },
        { at: 'Cycle 28 · 07:50 AM', location: 'Sector 4 Local Carrier', status: 'out_for_delivery', note: 'Out for delivery to Vector House.' },
        { at: 'Cycle 28 · 08:10 AM', location: 'Vector House · Parcel Locker #4B', status: 'delivered', note: 'Placed in secure residential parcel locker.' },
      ],
    },
    {
      id: 'POST-INIT-2',
      trackingNumber: 'RC-OR-1001',
      direction: 'incoming',
      kind: 'official_seal',
      carrier: 'Royal Courier',
      senderName: 'Regent Hall · Office of the Warden',
      senderAddress: '1 Crown Terrace, Royal Precinct, Orynvell OR-1001, Meridion',
      recipientName: 'Prospective Scholar · Suite 4B',
      recipientAddress: FORMATTED_PLAYER_ADDRESS,
      title: 'Regent Hall Royal Prospectus (Wax-Sealed)',
      description: 'Embossed cream parchment folio detailing royal education across all eight realms and the exclusive Empress Track.',
      sealLabel: 'REGENT HALL · EIGHT REALMS SEAL',
      paperBody:
        'To the Resident of Suite 4B,\n\nBy order of Warden Alistair Vance-Harrow, Regent Hall extends its Autumn 1000 Prospectus across all eight realms. Scholars of distinction may apply online at regenthall.edu/admissions for Eight-Realm Royal Studies, Diplomacy, and the exclusive Empress Track.\n\nKeep this physical folio for your personal records; digital applications are processed via VerseNet and AureMail.',
      status: 'delivered',
      opened: false,
      rewards: { xp: 15, itemName: 'Regent Hall Embossed Prospectus' },
      createdAt: 'Cycle 28 · 08:40 AM',
      events: [
        { at: 'Cycle 28 · 08:05 AM', location: 'Crown Terrace Dispatch (OR-1001)', status: 'in_transit', note: 'Wax-sealed folio handed to Royal Courier.' },
        { at: 'Cycle 28 · 08:40 AM', location: 'Vector House · Physical Mailbox #4B', status: 'delivered', note: 'Hand-delivered to residential mail slot.' },
      ],
    },
    {
      id: 'POST-INIT-3',
      trackingNumber: 'MP-OR-4210',
      direction: 'incoming',
      kind: 'postcard',
      carrier: 'Meridion Post',
      senderName: 'Dawn University Alumni Circle',
      senderAddress: '14 Dawn Court, Dawnson, Aureline, Orynvell OR-4210, Meridion',
      recipientName: 'Resident · Suite 4B',
      recipientAddress: FORMATTED_PLAYER_ADDRESS,
      title: 'Autumn Postcard from Dawnson',
      description: 'Illustrated botanical postcard from Dawnson, Aureline’s college town, featuring the Aether Conservatory glasshouse.',
      paperBody:
        'Greetings from Dawnson!\n\nThe autumn lanterns are lit along Dawn Court and the Concord Reading Hall is open daily to visiting scholars. Whether you’re studying Natural Sciences, Civic History, or Arcane Humanities, you always have a quiet desk waiting in Dawnson.\n\n— Dawn University Alumni Circle (dawn.edu)',
      status: 'delivered',
      opened: false,
      createdAt: 'Cycle 28 · 09:05 AM',
      events: [
        { at: 'Cycle 28 · 07:30 AM', location: 'Dawnson Town Post Office (OR-4210)', status: 'in_transit', note: 'Postmarked in Dawnson, Aureline.' },
        { at: 'Cycle 28 · 09:05 AM', location: 'Vector House · Physical Mailbox #4B', status: 'delivered', note: 'Delivered via morning letter carrier.' },
      ],
    },
    {
      id: 'POST-INIT-4',
      trackingNumber: 'CT-OR-8824',
      direction: 'incoming',
      kind: 'parcel',
      carrier: 'CargoTrack Express',
      senderName: 'CargoTrack Aureline Supply',
      senderAddress: '305 Freight Causeway, Dockside, Aureline, Orynvell OR-3305, Meridion',
      recipientName: 'Resident · Suite 4B',
      recipientAddress: FORMATTED_PLAYER_ADDRESS,
      title: 'Signal Diagnostic & Field Tool Pouch',
      description: 'Compact courier crate containing spare signal calibration leads and a physical parcel manifest.',
      status: 'out_for_delivery',
      opened: false,
      rewards: { xp: 25, itemName: 'Signal Calibration Field Pouch' },
      createdAt: 'Cycle 28 · 09:30 AM',
      events: [
        { at: 'Cycle 28 · 08:20 AM', location: 'Dockside CargoTrack Hub (OR-3305)', status: 'in_transit', note: 'Crate cleared municipal freight scan.' },
        { at: 'Cycle 28 · 09:30 AM', location: 'Aureline Express Courier Van #12', status: 'out_for_delivery', note: 'Approaching Vector House, Sector 4.' },
      ],
    },
  ];
}
