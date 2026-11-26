import { useId, useState } from 'react';
import {
  ENTERTAINMENT_DISCIPLINES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  type EntertainmentConcert,
  type EntertainmentDisciplineId,
  type EntertainmentPortalData,
} from '../services/entertainmentDataService';

export function TicketPurchaseWidget({
  concerts,
  data,
  accentColor,
  showWallet = true,
}: {
  concerts: EntertainmentConcert[];
  data: EntertainmentPortalData;
  accentColor?: string;
  showWallet?: boolean;
}) {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  return (
    <div className="ent-widget-stack">
      {concerts.length === 0 ? (
        <p className="ent-empty-note">No scheduled public ticketed performances listed on this calendar yet.</p>
      ) : (
        <ul className="ent-ticket-list" role="list">
          {concerts.map((con) => {
            const qty = qtyMap[con.concertId] ?? 1;
            const isPlayerShow = data.playerArtist && con.artistId === data.playerArtist.artistId && con.status === 'scheduled';
            return (
              <li key={con.concertId} className="ent-ticket-item">
                <div className="ent-ticket-meta">
                  <strong>{con.title}</strong>
                  <span>
                    {con.venue} · {con.dateLabel} · {con.ticketsSold.toLocaleString()} / {con.capacity.toLocaleString()} seats
                  </span>
                  <small>{con.audienceReaction}</small>
                </div>
                <div className="ent-ticket-controls">
                  {con.status === 'scheduled' ? (
                    <>
                      <label className="visually-hidden" htmlFor={`qty-${con.concertId}`}>
                        Ticket quantity for {con.title}
                      </label>
                      <select
                        id={`qty-${con.concertId}`}
                        value={qty}
                        onChange={(e) => setQtyMap((prev) => ({ ...prev, [con.concertId]: Number(e.target.value) }))}
                        className="ent-select-compact"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n}x
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ent-btn-primary"
                        style={accentColor ? { background: accentColor } : undefined}
                        onClick={() => data.actions.purchaseTicket(con.concertId, qty)}
                      >
                        Buy Tickets ({con.ticketPrice * qty} ₢)
                      </button>
                      {isPlayerShow && (
                        <button
                          type="button"
                          className="ent-btn-secondary"
                          onClick={() => data.actions.performConcertNow(con.concertId)}
                        >
                          Perform Now
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="ent-mono-tag">Settled ({con.grossRevenue.toLocaleString()} ₢)</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showWallet && (
        <div className="ent-wallet-box">
          <h3>Your Ticket Wallet ({data.ent.tickets.length})</h3>
          {data.ent.tickets.length === 0 ? (
            <p className="ent-empty-note">
              Purchased tickets appear here. Ordinary citizens can attend any club gig, play, or stadium concert.
            </p>
          ) : (
            <ul className="ent-wallet-list" role="list">
              {data.ent.tickets.map((tkt) => (
                <li key={tkt.ticketId} className="ent-wallet-item">
                  <div>
                    <strong>{tkt.concertTitle}</strong>
                    <span>
                      {tkt.venue} · {tkt.quantity}x ({tkt.pricePaid} ₢)
                    </span>
                  </div>
                  {!tkt.attended ? (
                    <button
                      type="button"
                      className="ent-btn-secondary"
                      onClick={() => data.actions.attendTicket(tkt.ticketId)}
                    >
                      Attend Show
                    </button>
                  ) : (
                    <span className="ent-mono-tag">✓ Attended</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function VenueBookingForm({
  data,
  restrictVenueOrgId,
  accentColor,
}: {
  data: EntertainmentPortalData;
  restrictVenueOrgId?: string;
  accentColor?: string;
}) {
  const slotId = useId();
  const cyclesId = useId();
  const priceId = useId();
  const [slot, setSlot] = useState<'afternoon' | 'evening' | 'late'>('evening');
  const [cyclesAhead, setCyclesAhead] = useState(2);
  const [ticketPrice, setTicketPrice] = useState(
    VENUE_CATALOG.find((v) => v.orgId === restrictVenueOrgId)?.suggestedTicket ?? 24,
  );

  const venues = restrictVenueOrgId
    ? VENUE_CATALOG.filter((v) => v.orgId === restrictVenueOrgId)
    : [...VENUE_CATALOG];

  return (
    <div className="ent-widget-stack">
      <div className="ent-form-grid-3">
        <div className="ent-field">
          <label htmlFor={slotId} className="ent-field-label">
            Performance Slot
          </label>
          <select
            id={slotId}
            value={slot}
            onChange={(e) => setSlot(e.target.value as 'afternoon' | 'evening' | 'late')}
            className="ent-input"
          >
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="late">Late Set</option>
          </select>
        </div>
        <div className="ent-field">
          <label htmlFor={cyclesId} className="ent-field-label">
            Cycles Ahead
          </label>
          <input
            id={cyclesId}
            type="number"
            min={1}
            max={8}
            value={cyclesAhead}
            onChange={(e) => setCyclesAhead(Number(e.target.value))}
            className="ent-input"
          />
        </div>
        <div className="ent-field">
          <label htmlFor={priceId} className="ent-field-label">
            Ticket Price (₢)
          </label>
          <input
            id={priceId}
            type="number"
            min={5}
            max={500}
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value))}
            className="ent-input"
          />
        </div>
      </div>

      <div className="ent-action-row">
        {venues.map((v) => (
          <button
            key={v.orgId}
            type="button"
            className="ent-btn-primary"
            style={accentColor ? { background: accentColor } : undefined}
            onClick={() =>
              data.actions.bookVenue({
                venueOrgId: v.orgId,
                scheduledInCycles: cyclesAhead,
                slot,
                ticketPrice,
              })
            }
          >
            Hold {v.name} ({v.capacity.toLocaleString()} cap · {v.rentalCost} ₢ · Min Rec {v.minRecognition})
          </button>
        ))}
      </div>
    </div>
  );
}

export function PerformerRegistrationForm({
  data,
  accentColor,
}: {
  data: EntertainmentPortalData;
  accentColor?: string;
}) {
  const stageId = useId();
  const discId = useId();
  const genreId = useId();
  const errId = useId();
  const [stageName, setStageName] = useState(data.playerArtist?.stageName || data.playerName || '');
  const [touched, setTouched] = useState(false);
  const [disc, setDisc] = useState<EntertainmentDisciplineId>(data.playerArtist?.disciplines[0] || 'music');
  const [genre, setGenre] = useState(data.playerArtist?.genres[0] || 'Dream Pop');
  const invalid = touched && stageName.trim().length < 2;

  return (
    <form
      noValidate
      className="ent-widget-stack"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (stageName.trim().length < 2) return;
        data.actions.registerArtist({ stageName, disciplines: [disc], genres: [genre] });
      }}
    >
      <div className="ent-field">
        <label htmlFor={stageId} className="ent-field-label">
          Stage or Professional Name
        </label>
        <span className="ent-field-hint">2–60 characters. New performers start Unlisted and grow through real releases and shows.</span>
        <input
          id={stageId}
          required
          minLength={2}
          maxLength={60}
          value={stageName}
          onBlur={() => setTouched(true)}
          onChange={(e) => setStageName(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errId : undefined}
          className={`ent-input ${invalid ? 'user-invalid-fallback' : ''}`}
        />
        {invalid && (
          <span id={errId} className="ent-field-error">
            Enter at least 2 characters for your stage or professional name.
          </span>
        )}
      </div>
      <div className="ent-form-grid-2">
        <div className="ent-field">
          <label htmlFor={discId} className="ent-field-label">
            Primary Discipline
          </label>
          <select
            id={discId}
            value={disc}
            onChange={(e) => setDisc(e.target.value as EntertainmentDisciplineId)}
            className="ent-input"
          >
            {ENTERTAINMENT_DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ent-field">
          <label htmlFor={genreId} className="ent-field-label">
            Signature Style / Genre
          </label>
          <input id={genreId} value={genre} onChange={(e) => setGenre(e.target.value)} className="ent-input" />
        </div>
      </div>
      <button type="submit" className="ent-btn-primary" style={accentColor ? { background: accentColor } : undefined}>
        {data.playerArtist ? 'Update Professional Profile' : 'Activate Professional Profile'}
      </button>
    </form>
  );
}

export function ReleasePublishForm({
  data,
  distributorOrgId,
  labelOrgId,
  accentColor,
}: {
  data: EntertainmentPortalData;
  distributorOrgId?: string;
  labelOrgId?: string;
  accentColor?: string;
}) {
  const titleId = useId();
  const genreId = useId();
  const stemId = useId();
  const errId = useId();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Alternative R&B');
  const [audioUrl, setAudioUrl] = useState<string>(SHIPPED_AUDIO_ASSETS[0].audioUrl);
  const [touched, setTouched] = useState(false);
  const invalid = touched && title.trim().length < 2;

  return (
    <form
      noValidate
      className="ent-widget-stack"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (title.trim().length < 2) return;
        data.actions.publishRelease({ title, genre, audioUrl, distributorOrgId, labelOrgId });
        setTitle('');
        setTouched(false);
      }}
    >
      <div className="ent-field">
        <label htmlFor={titleId} className="ent-field-label">
          Release Title
        </label>
        <input
          id={titleId}
          required
          minLength={2}
          value={title}
          onBlur={() => setTouched(true)}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errId : undefined}
          placeholder="e.g. Harbor Lights at Dusk"
          className={`ent-input ${invalid ? 'user-invalid-fallback' : ''}`}
        />
        {invalid && (
          <span id={errId} className="ent-field-error">
            Enter a release title of at least 2 characters.
          </span>
        )}
      </div>
      <div className="ent-form-grid-2">
        <div className="ent-field">
          <label htmlFor={genreId} className="ent-field-label">
            Genre
          </label>
          <input id={genreId} value={genre} onChange={(e) => setGenre(e.target.value)} className="ent-input" />
        </div>
        <div className="ent-field">
          <label htmlFor={stemId} className="ent-field-label">
            Master Audio Stem
          </label>
          <select id={stemId} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} className="ent-input">
            {SHIPPED_AUDIO_ASSETS.map((a) => (
              <option key={a.id} value={a.audioUrl}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="ent-btn-primary" style={accentColor ? { background: accentColor } : undefined}>
        Publish Master to Songbird & MMRS
      </button>
    </form>
  );
}
