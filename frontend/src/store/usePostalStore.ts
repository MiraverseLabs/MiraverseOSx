import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FORMATTED_PLAYER_ADDRESS,
  POSTAGE_RATES,
  buildInitialShipments,
  generateTrackingNumber,
  nextParcelStatus,
  type ParcelStatus,
  type PostalItemKind,
  type PostalReward,
  type PostalShipment,
} from '../gameplay/Postal';

export interface IncomingDeliveryInput {
  id?: string;
  kind: PostalItemKind;
  carrier?: PostalShipment['carrier'];
  senderName: string;
  senderAddress: string;
  title: string;
  description: string;
  sealLabel?: string;
  paperBody?: string;
  rewards?: PostalReward;
  status?: ParcelStatus;
}

export interface SendOutboundInput {
  recipientName: string;
  recipientAddress: string;
  kind: PostalItemKind;
  title: string;
  note: string;
  itemName?: string;
}

interface PostalStoreState {
  shipments: PostalShipment[];
  collectedItems: string[];
  focusedTrackingNumber?: string;
  focusTracking: (trackingNumber?: string) => void;
  unboxShipment: (id: string) => { ok: boolean; message: string };
  advanceShipment: (id: string) => { ok: boolean; message: string };
  enqueueIncomingDelivery: (input: IncomingDeliveryInput) => PostalShipment;
  sendOutboundShipment: (input: SendOutboundInput) => { ok: boolean; message: string; shipment?: PostalShipment };
}

async function notifyAureMailDelivery(shipment: PostalShipment, heading: string, body: string) {
  try {
    const { useCommsStore } = await import('./useCommsStore');
    const deliver = useCommsStore.getState()?.deliverInstitutionalEmail;
    if (typeof deliver !== 'function') return;
    deliver({
      id: `POST-ALERT-${shipment.id}-${shipment.status}`,
      sender: `${shipment.carrier} Notifications`,
      senderAddress: shipment.carrier === 'CargoTrack Express' ? 'tracking@shipping.aure' : 'notices@meridionpost.aure',
      recipientAddress: 'citizen@auremail.aure',
      faction: 'Meridion Post',
      subject: `${heading}: ${shipment.title} [${shipment.trackingNumber}]`,
      body: `${body}\n\n• Tracking Number: ${shipment.trackingNumber}\n• Carrier: ${shipment.carrier}\n• Destination: ${shipment.recipientAddress}\n\nOpen the Meridion Post desktop app to view full tracking or unbox your physical delivery.`,
      time: 'Just now',
      read: false,
      folder: 'inbox',
      accountType: 'institutional',
      category: 'delivery',
      trackingNumber: shipment.trackingNumber,
      linkedApp: 'post',
      institutionalSeal: `TRACKING-${shipment.trackingNumber}`,
      attachment: null,
    });
  } catch {
    // Non-browser test environments may not mount useCommsStore.
  }
}

export const usePostalStore = create<PostalStoreState>()(
  persist(
    (set, get) => ({
      shipments: buildInitialShipments(),
      collectedItems: [],
      focusedTrackingNumber: undefined,

      focusTracking: trackingNumber => set({ focusedTrackingNumber: trackingNumber }),

      unboxShipment: id => {
        const target = get().shipments.find(s => s.id === id);
        if (!target) return { ok: false, message: 'Shipment not found.' };
        if (target.direction !== 'incoming') return { ok: false, message: 'Only incoming deliveries can be unboxed.' };
        if (target.status !== 'delivered') return { ok: false, message: 'This shipment has not arrived at Suite 4B yet.' };
        if (target.opened) return { ok: false, message: 'Already opened and collected.' };

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const reward = target.rewards;
        const shouldReward = Boolean(reward && !target.rewardClaimed);

        set(s => ({
          shipments: s.shipments.map(item =>
            item.id === id ? { ...item, opened: true, openedAt: now, rewardClaimed: true } : item,
          ),
          collectedItems:
            reward?.itemName && !s.collectedItems.includes(reward.itemName)
              ? [reward.itemName, ...s.collectedItems]
              : s.collectedItems,
        }));

        if (shouldReward && reward) {
          void import('./useOSStore').then(({ useOSStore }) => {
            const os = useOSStore.getState();
            if (reward.credits) os.addCredits(reward.credits);
            if (reward.xp) os.addXP(reward.xp);
          }).catch(() => {});
        }

        const parts: string[] = [];
        if (reward?.itemName) parts.push(`Collected "${reward.itemName}"`);
        if (reward?.credits) parts.push(`+${reward.credits} ₡`);
        if (reward?.xp) parts.push(`+${reward.xp} XP`);
        return {
          ok: true,
          message: parts.length ? `Unboxed: ${parts.join(' · ')}.` : `Opened "${target.title}".`,
        };
      },

      advanceShipment: id => {
        const target = get().shipments.find(s => s.id === id);
        if (!target) return { ok: false, message: 'Shipment not found.' };
        if (target.status === 'delivered') return { ok: false, message: 'Already delivered.' };
        const next = nextParcelStatus(target.status);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const location =
          next === 'in_transit'
            ? 'Aureline Central Sorting Hub (OR-4000)'
            : next === 'out_for_delivery'
              ? target.direction === 'incoming'
                ? 'Sector 4 Local Carrier'
                : 'Destination District Courier'
              : target.direction === 'incoming'
                ? 'Vector House · Parcel Locker #4B'
                : target.recipientAddress;
        const note =
          next === 'delivered'
            ? target.direction === 'incoming'
              ? 'Delivered to Suite 4B residential parcel locker. Ready to unbox.'
              : `Signed and delivered to ${target.recipientName}.`
            : next === 'out_for_delivery'
              ? 'Loaded onto courier vehicle for final delivery.'
              : 'Processed through Meridion Post regional sorting center.';

        const updated: PostalShipment = {
          ...target,
          status: next,
          events: [...target.events, { at: `Today · ${now}`, location, status: next, note }],
        };
        set(s => ({ shipments: s.shipments.map(item => (item.id === id ? updated : item)) }));
        if (next === 'delivered' && target.direction === 'incoming') {
          void notifyAureMailDelivery(
            updated,
            'Package Delivered',
            `Your physical delivery "${updated.title}" has arrived at Vector House Suite 4B.`,
          );
        }
        return { ok: true, message: `${updated.trackingNumber} updated: ${note}` };
      },

      enqueueIncomingDelivery: input => {
        const id = input.id || `POST-${crypto.randomUUID()}`;
        const existing = get().shipments.find(s => s.id === id);
        if (existing) return existing;
        const carrier = input.carrier || (input.kind === 'official_seal' ? 'Royal Courier' : input.kind === 'parcel' ? 'CargoTrack Express' : 'Meridion Post');
        const prefix = carrier === 'Royal Courier' ? 'RC' : carrier === 'CargoTrack Express' ? 'CT' : 'MP';
        const trackingNumber = generateTrackingNumber(prefix);
        const status = input.status || 'delivered';
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const shipment: PostalShipment = {
          id,
          trackingNumber,
          direction: 'incoming',
          kind: input.kind,
          carrier,
          senderName: input.senderName,
          senderAddress: input.senderAddress,
          recipientName: 'Resident · Suite 4B',
          recipientAddress: FORMATTED_PLAYER_ADDRESS,
          title: input.title,
          description: input.description,
          sealLabel: input.sealLabel,
          paperBody: input.paperBody,
          status,
          opened: false,
          rewards: input.rewards,
          createdAt: `Today · ${now}`,
          events: [
            { at: `Today · ${now}`, location: input.senderAddress, status: 'label_created', note: `Dispatched by ${input.senderName}.` },
            { at: `Today · ${now}`, location: 'Aureline Central Sorting Hub (OR-4000)', status: 'in_transit', note: 'Cleared regional postal routing.' },
            ...(status === 'delivered'
              ? [{ at: `Today · ${now}`, location: 'Vector House · Parcel Locker #4B', status: 'delivered' as const, note: 'Placed in Suite 4B locker. Ready to unbox.' }]
              : [{ at: `Today · ${now}`, location: 'Sector 4 Local Carrier', status: 'out_for_delivery' as const, note: 'Out for delivery to Suite 4B.' }]),
          ],
        };
        set(s => ({ shipments: [shipment, ...s.shipments] }));
        void notifyAureMailDelivery(
          shipment,
          status === 'delivered' ? 'Package Delivered' : 'Shipment Dispatched',
          status === 'delivered'
            ? `"${shipment.title}" from ${shipment.senderName} has been delivered to your Suite 4B mailbox/parcel locker.`
            : `"${shipment.title}" from ${shipment.senderName} is on its way to Suite 4B.`,
        );
        return shipment;
      },

      sendOutboundShipment: input => {
        const recipientName = input.recipientName.trim();
        const recipientAddress = input.recipientAddress.trim();
        const title = input.title.trim();
        if (!recipientName || !recipientAddress || !title) {
          return { ok: false, message: 'Enter recipient name, Meridion postal address, and shipment title.' };
        }
        const rate = POSTAGE_RATES[input.kind];
        const trackingNumber = generateTrackingNumber(
          rate.carrier === 'Royal Courier' ? 'RC' : rate.carrier === 'CargoTrack Express' ? 'CT' : 'MP',
        );
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const shipment: PostalShipment = {
          id: `POST-OUT-${crypto.randomUUID()}`,
          trackingNumber,
          direction: 'outgoing',
          kind: input.kind,
          carrier: rate.carrier,
          senderName: 'Resident · Suite 4B',
          senderAddress: FORMATTED_PLAYER_ADDRESS,
          recipientName,
          recipientAddress,
          title,
          description: input.itemName ? `Enclosed item: ${input.itemName}` : `${rate.label} dispatched via ${rate.carrier}.`,
          paperBody: input.note.trim() || undefined,
          status: 'in_transit',
          opened: true,
          postagePaid: rate.cost,
          createdAt: `Today · ${now}`,
          events: [
            { at: `Today · ${now}`, location: 'Vector House · Outgoing Drop Box', status: 'label_created', note: `Postage paid (${rate.cost} ₡).` },
            { at: `Today · ${now}`, location: 'Aureline Central Sorting Hub (OR-4000)', status: 'in_transit', note: `Accepted by ${rate.carrier} and routed toward destination.` },
          ],
        };

        set(s => ({ shipments: [shipment, ...s.shipments] }));
        void notifyAureMailDelivery(
          shipment,
          'Postage Receipt',
          `Your outgoing ${rate.label.toLowerCase()} "${title}" to ${recipientName} has been accepted (${rate.cost} ₡ postage).`,
        );
        return {
          ok: true,
          message: `Dispatched ${trackingNumber} to ${recipientName} (${rate.cost} ₡ postage). Receipt sent to AureMail.`,
          shipment,
        };
      },
    }),
    {
      name: 'miraverse-postal-v1',
      partialize: state => ({
        shipments: state.shipments,
        collectedItems: state.collectedItems,
      }),
    },
  ),
);
