import React, { useEffect, useState } from 'react';
import {
  Archive, ArrowUpRight, CheckCircle2, Mail, MapPin, Package,
  PackageOpen, Search, Send, Stamp, Truck,
} from 'lucide-react';
import {
  FORMATTED_PLAYER_ADDRESS,
  MERIDION_ADDRESS_BOOK,
  POSTAGE_RATES,
  statusLabel,
  type PostalItemKind,
  type PostalShipment,
} from '../gameplay/Postal';
import { usePostalStore } from '../store/usePostalStore';
import { useOSStore } from '../store/useOSStore';
import '../styles/apps/postal.css';

type PostalTab = 'locker' | 'letters' | 'tracking' | 'send' | 'keepsakes';

export default function PostalApp() {
  const [tab, setTab] = useState<PostalTab>('locker');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [notice, setNotice] = useState('');

  // Outbound shipping form
  const [presetId, setPresetId] = useState(MERIDION_ADDRESS_BOOK[0].id);
  const [recipientName, setRecipientName] = useState(MERIDION_ADDRESS_BOOK[0].name);
  const [recipientAddress, setRecipientAddress] = useState(MERIDION_ADDRESS_BOOK[0].address);
  const [sendKind, setSendKind] = useState<PostalItemKind>('parcel');
  const [sendTitle, setSendTitle] = useState('');
  const [sendItem, setSendItem] = useState('');
  const [sendNote, setSendNote] = useState('');

  const { shipments, collectedItems, focusedTrackingNumber, focusTracking, unboxShipment, advanceShipment, sendOutboundShipment } =
    usePostalStore();
  const osState = useOSStore();
  const credits = osState.gameplay.player?.credits ?? 0;
  const request = osState.workspaceRequests.post;

  useEffect(() => {
    if (!request) return;
    if (request.section.startsWith('track:')) {
      setTrackingQuery(request.section.slice(6));
      setTab('tracking');
    } else if (['locker', 'letters', 'tracking', 'send', 'keepsakes'].includes(request.section)) {
      setTab(request.section as PostalTab);
    }
    useOSStore.getState().consumeWorkspaceRequest('post', request.revision);
  }, [request]);

  useEffect(() => {
    if (focusedTrackingNumber) {
      setTrackingQuery(focusedTrackingNumber);
      setTab('tracking');
      focusTracking(undefined);
    }
  }, [focusedTrackingNumber, focusTracking]);

  const incomingParcels = shipments.filter(s => s.direction === 'incoming' && s.kind === 'parcel');
  const incomingLetters = shipments.filter(s => s.direction === 'incoming' && s.kind !== 'parcel');
  const unopenedParcels = incomingParcels.filter(s => s.status === 'delivered' && !s.opened).length;
  const unopenedLetters = incomingLetters.filter(s => s.status === 'delivered' && !s.opened).length;
  const inTransitCount = shipments.filter(s => s.status !== 'delivered').length;

  const handleUnbox = (id: string) => {
    const res = unboxShipment(id);
    setNotice(res.message);
  };

  const handleAdvance = (id: string) => {
    const res = advanceShipment(id);
    setNotice(res.message);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = POSTAGE_RATES[sendKind];
    if (credits < rate.cost) {
      setNotice(`Insufficient Credits for postage (${rate.cost} ₡ required, ${credits} ₡ available).`);
      return;
    }
    const res = sendOutboundShipment({
      recipientName,
      recipientAddress,
      kind: sendKind,
      title: sendTitle,
      note: sendNote,
      itemName: sendItem.trim() || undefined,
    });
    if (res.ok) {
      osState.addCredits(-rate.cost);
      setSendTitle('');
      setSendItem('');
      setSendNote('');
      setTab('tracking');
      setTrackingQuery(res.shipment?.trackingNumber || '');
    }
    setNotice(res.message);
  };

  const renderShipmentCard = (item: PostalShipment, showTimeline = false) => (
    <article
      key={item.id}
      className={`postal-card ${item.direction === 'incoming' && item.status === 'delivered' && !item.opened ? 'postal-card-unopened' : ''}`}
    >
      <div className="postal-card-top">
        <span className="postal-tracking-pill">{item.trackingNumber}</span>
        <span className={`postal-status-pill ${item.status !== 'delivered' ? 'is-transit' : ''}`}>
          {item.direction === 'outgoing' && item.status === 'delivered' ? 'Delivered to Recipient' : statusLabel(item.status)}
        </span>
      </div>
      {item.sealLabel && (
        <span className="postal-seal"><Stamp size={12} /> {item.sealLabel}</span>
      )}
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <div style={{ fontSize: 11.5, color: '#6b5d4c' }}>
        <strong>{item.direction === 'incoming' ? 'From:' : 'To:'}</strong>{' '}
        {item.direction === 'incoming' ? item.senderName : item.recipientName} · {item.carrier}
      </div>

      {item.paperBody && (item.opened || item.kind === 'postcard' || item.direction === 'outgoing') && (
        <div className="postal-paper">{item.paperBody}</div>
      )}

      {showTimeline && (
        <ol className="postal-timeline" aria-label={`Tracking history for ${item.trackingNumber}`}>
          {item.events.map((ev, idx) => (
            <li key={idx}>
              <strong>{ev.location}</strong> · <span>{ev.at}</span>
              <div style={{ color: '#54483a' }}>{ev.note}</div>
            </li>
          ))}
        </ol>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
        {item.direction === 'incoming' && item.status === 'delivered' && !item.opened && (
          <button className="postal-btn-primary" onClick={() => handleUnbox(item.id)}>
            <PackageOpen size={14} /> {item.kind === 'parcel' ? 'Unbox Package' : 'Break Seal & Read'}
          </button>
        )}
        {item.direction === 'incoming' && item.opened && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1f4b3f' }}>
            <CheckCircle2 size={14} /> Collected {item.openedAt ? `· ${item.openedAt}` : ''}
          </span>
        )}
        {item.status !== 'delivered' && (
          <button className="postal-btn-secondary" onClick={() => handleAdvance(item.id)}>
            <Truck size={14} /> Check Courier Progress
          </button>
        )}
        {!showTimeline && (
          <button
            className="postal-btn-secondary"
            onClick={() => {
              setTrackingQuery(item.trackingNumber);
              setTab('tracking');
            }}
          >
            Track Shipment
          </button>
        )}
      </div>
    </article>
  );

  const filteredTracking = shipments.filter(s => {
    const q = trackingQuery.trim().toLowerCase();
    if (!q) return true;
    return `${s.trackingNumber} ${s.title} ${s.senderName} ${s.recipientName} ${s.carrier}`.toLowerCase().includes(q);
  });

  return (
    <section className="postal-app" aria-label="Meridion Post — Physical Mailbox, Packages and Tracking">
      <aside className="postal-sidebar">
        <div className="postal-brand">
          <div className="postal-stamp" aria-hidden="true"><Package size={20} /></div>
          <div>
            <strong>Meridion Post</strong>
            <span>Physical Mail, Parcels & Tracking</span>
          </div>
        </div>

        <div className="postal-address-card">
          <strong><MapPin size={11} style={{ verticalAlign: 'middle' }} /> Your Physical Address</strong>
          {FORMATTED_PLAYER_ADDRESS}
        </div>

        <nav className="postal-nav" aria-label="Postal sections">
          <button aria-pressed={tab === 'locker'} onClick={() => setTab('locker')}>
            <span className="postal-nav-label"><Package size={15} /> Parcel Locker</span>
            {unopenedParcels > 0 && <span className="postal-badge">{unopenedParcels}</span>}
          </button>
          <button aria-pressed={tab === 'letters'} onClick={() => setTab('letters')}>
            <span className="postal-nav-label"><Stamp size={15} /> Physical Letters</span>
            {unopenedLetters > 0 && <span className="postal-badge">{unopenedLetters}</span>}
          </button>
          <button aria-pressed={tab === 'tracking'} onClick={() => setTab('tracking')}>
            <span className="postal-nav-label"><Truck size={15} /> Live Tracking</span>
            {inTransitCount > 0 && <span className="postal-badge">{inTransitCount}</span>}
          </button>
          <button aria-pressed={tab === 'send'} onClick={() => setTab('send')}>
            <span className="postal-nav-label"><Send size={15} /> Send Mail / Parcel</span>
          </button>
          <button aria-pressed={tab === 'keepsakes'} onClick={() => setTab('keepsakes')}>
            <span className="postal-nav-label"><Archive size={15} /> Collected Items</span>
            <span className="postal-badge">{collectedItems.length}</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #ebe2d2', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="postal-btn-secondary" onClick={() => osState.openAppWorkspace('mail')}>
            <Mail size={14} /> Open Digital AureMail
          </button>
          <button
            className="postal-btn-secondary"
            onClick={() => {
              osState.openBrowserTab('https://shipping.aure');
              osState.openAppWorkspace('browser');
            }}
          >
            CargoTrack Web <ArrowUpRight size={13} />
          </button>
        </div>
      </aside>

      <main className="postal-main">
        {notice && <div className="postal-notice" role="status">{notice}</div>}

        {tab === 'locker' && (
          <>
            <header className="postal-header">
              <div>
                <span className="postal-eyebrow">Vector House · Suite 4B Parcel Locker</span>
                <h1>Incoming Packages & Deliveries</h1>
                <p>Physical parcels from HOMECRAFT, CargoTrack, and Aureline couriers. Unbox delivered packages to collect items.</p>
              </div>
              <button className="postal-btn-primary" onClick={() => setTab('send')}>
                <Send size={14} /> Ship a Parcel
              </button>
            </header>
            <div className="postal-grid">
              {incomingParcels.map(item => renderShipmentCard(item, false))}
            </div>
          </>
        )}

        {tab === 'letters' && (
          <>
            <header className="postal-header">
              <div>
                <span className="postal-eyebrow">Physical Mail Slot · Suite 4B</span>
                <h1>Paper Letters, Postcards & Wax Seals</h1>
                <p>Tactile physical correspondence—wax-sealed university folios, diplomas, and postcards from across the realms.</p>
              </div>
            </header>
            <div className="postal-grid">
              {incomingLetters.map(item => renderShipmentCard(item, false))}
            </div>
          </>
        )}

        {tab === 'tracking' && (
          <>
            <header className="postal-header">
              <div>
                <span className="postal-eyebrow">Meridion Post & CargoTrack Manifest</span>
                <h1>Live Shipment Tracking</h1>
                <p>Follow every incoming and outgoing physical shipment from sorting hub to doorstep.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={15} color="#6b5d4c" />
                <input
                  type="search"
                  aria-label="Filter by tracking number or title"
                  placeholder="Search tracking # (e.g. MP-OR-4012)…"
                  value={trackingQuery}
                  onChange={e => setTrackingQuery(e.target.value)}
                  style={{ background: '#fff', border: '1px solid #d5c7b2', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, minWidth: 230 }}
                />
              </div>
            </header>
            <div className="postal-grid">
              {filteredTracking.map(item => renderShipmentCard(item, true))}
              {!filteredTracking.length && <p>No shipments match "{trackingQuery}".</p>}
            </div>
          </>
        )}

        {tab === 'send' && (
          <>
            <header className="postal-header">
              <div>
                <span className="postal-eyebrow">Outgoing Counter · Available Balance: {credits} ₡</span>
                <h1>Send Physical Mail or Parcel</h1>
                <p>Dispatch a postcard, sealed letter, or tracked parcel to any Meridion postal address. A digital receipt is emailed to AureMail.</p>
              </div>
            </header>
            <form className="postal-card postal-form" onSubmit={handleSend}>
              <label>
                Quick-Fill from Meridion Address Book
                <select
                  value={presetId}
                  onChange={e => {
                    const entry = MERIDION_ADDRESS_BOOK.find(a => a.id === e.target.value);
                    setPresetId(e.target.value);
                    if (entry) {
                      setRecipientName(entry.name);
                      setRecipientAddress(entry.address);
                    }
                  }}
                >
                  {MERIDION_ADDRESS_BOOK.map(entry => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.postalCode})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Recipient Name
                <input required value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </label>

              <label>
                Meridion Postal Address
                <input required value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} />
              </label>

              <label>
                Mail Class & Postage
                <select value={sendKind} onChange={e => setSendKind(e.target.value as PostalItemKind)}>
                  {(Object.entries(POSTAGE_RATES) as [PostalItemKind, typeof POSTAGE_RATES.parcel][]).map(([k, rate]) => (
                    <option key={k} value={k}>
                      {rate.label} — {rate.cost} ₡ ({rate.carrier})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Shipment Title / Label
                <input
                  required
                  value={sendTitle}
                  onChange={e => setSendTitle(e.target.value)}
                  placeholder="e.g. Annotated Research Folio or Calibration Parts"
                />
              </label>

              <label>
                Enclosed Physical Item (optional)
                <input
                  value={sendItem}
                  onChange={e => setSendItem(e.target.value)}
                  placeholder="e.g. Spare Aether Coil, Printed Transcript"
                />
              </label>

              <label>
                Paper Letter / Packing Note
                <textarea
                  rows={4}
                  value={sendNote}
                  onChange={e => setSendNote(e.target.value)}
                  placeholder="Write a physical note to enclose inside..."
                />
              </label>

              <button type="submit" className="postal-btn-primary">
                <Send size={14} /> Pay {POSTAGE_RATES[sendKind].cost} ₡ Postage & Dispatch
              </button>
            </form>
          </>
        )}

        {tab === 'keepsakes' && (
          <>
            <header className="postal-header">
              <div>
                <span className="postal-eyebrow">Suite 4B Personal Shelf</span>
                <h1>Collected Physical Items & Folios</h1>
                <p>Items and wax-sealed documents you have unboxed from your residential parcel locker.</p>
              </div>
            </header>
            {collectedItems.length ? (
              <div className="postal-grid">
                {collectedItems.map(item => (
                  <article key={item} className="postal-card">
                    <span className="postal-eyebrow">Unboxed Keepsake</span>
                    <h3>{item}</h3>
                    <p>Stored safely in Vector House, Suite 4B.</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="postal-card">
                <p>No items collected yet. Unbox your waiting deliveries in the Parcel Locker or Physical Letters tab!</p>
              </div>
            )}
          </>
        )}
      </main>
    </section>
  );
}
