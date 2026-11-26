import type { ReactNode } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { EntertainmentPortalData } from '../services/entertainmentDataService';

export interface AuthPortalGateProps {
  data: EntertainmentPortalData;
  portalName: string;
  description: string;
  requireArtistProfile?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Enforces strict separation between public VerseNet visitors and authenticated
 * artist/member/client portals. Private royalties, contracts, applications, and
 * schedules are never rendered until the visitor is authenticated.
 */
export function AuthPortalGate({
  data,
  portalName,
  description,
  requireArtistProfile = false,
  children,
  className = '',
}: AuthPortalGateProps) {
  if (!data.isAuthenticated) {
    return (
      <section className={`ent-auth-gate ${className}`} aria-label={`${portalName} sign in required`}>
        <div className="ent-auth-gate-badge">
          <Lock size={16} aria-hidden="true" />
          <span>Authenticated Access Only</span>
        </div>
        <h2>{portalName}</h2>
        <p>{description}</p>
        <p className="ent-auth-gate-note">
          Private royalty statements, representation agreements, submission trackers, and member schedules are
          hidden from public visitors.
        </p>
        <button
          type="button"
          className="ent-btn-primary"
          onClick={() => data.actions.signInDemoCitizen()}
        >
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Sign in with Citizen Identity</span>
        </button>
      </section>
    );
  }

  if (requireArtistProfile && !data.playerArtist) {
    return (
      <section className={`ent-auth-gate ${className}`} aria-label={`${portalName} performer profile required`}>
        <div className="ent-auth-gate-badge">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Signed in as {data.playerName}</span>
        </div>
        <h2>{portalName}</h2>
        <p>{description}</p>
        <p className="ent-auth-gate-note">
          Activate a professional performer profile below to access artist-side tools. New profiles begin
          Unlisted and earn standing through real work.
        </p>
        {children}
      </section>
    );
  }

  return <>{children}</>;
}
