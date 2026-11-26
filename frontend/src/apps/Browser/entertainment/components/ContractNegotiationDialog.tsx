import { useEffect, useId, useRef, useState } from 'react';
import type { EntertainmentSiteMeta } from '../entertainmentRouter';
import type { CanonicalEntertainmentOrg, EntertainmentPortalData } from '../services/entertainmentDataService';

export type ContractKind = 'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild';

export interface ContractNegotiationDialogProps {
  open: boolean;
  onClose: () => void;
  site: EntertainmentSiteMeta;
  org: CanonicalEntertainmentOrg;
  contractType: ContractKind;
  data: EntertainmentPortalData;
}

export function ContractNegotiationDialog({
  open,
  onClose,
  site,
  org,
  contractType,
  data,
}: ContractNegotiationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const rangeId = useId();
  const baseline = Math.round((org.royaltySplitArtist ?? 0.82) * 100);
  const [requestedSplit, setRequestedSplit] = useState(baseline);
  const [switchAgency, setSwitchAgency] = useState(true);
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    setRequestedSplit(baseline);
  }, [baseline, open, contractType]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isOutside = (e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      ref={dialogRef}
      className="ent-native-dialog"
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      onPointerDown={(e) => {
        const dialog = dialogRef.current;
        if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
          pressedOutsideRef.current = isOutside(e, dialog);
        }
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current;
        if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
          if (pressedOutsideRef.current && isOutside(e, dialog)) dialog.close();
          pressedOutsideRef.current = false;
        }
      }}
    >
      <div className="ent-dialog-surface">
        <div className="ent-dialog-head">
          <h1 id={titleId}>
            Negotiate {contractType.toUpperCase()} Agreement · {site.name}
          </h1>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close agreement dialog"
            className="ent-dialog-close"
          >
            ×
          </button>
        </div>
        <p className="ent-dialog-copy">
          Review royalty retention and representation terms with {site.name}. Higher artist splits require
          established Industry Reputation (48+) or active Meridion Performers Association membership.
        </p>
        <div className="ent-field">
          <label htmlFor={rangeId} className="ent-field-label">
            Requested Artist Royalty Share: <strong>{requestedSplit}%</strong> (House baseline: {baseline}%)
          </label>
          <input
            id={rangeId}
            type="range"
            min={50}
            max={95}
            value={requestedSplit}
            onChange={(e) => setRequestedSplit(Number(e.target.value))}
          />
        </div>
        <label className="ent-checkbox-row">
          <input
            type="checkbox"
            checked={switchAgency}
            onChange={(e) => setSwitchAgency(e.target.checked)}
          />
          <span>Replace any existing active {contractType} agreement cleanly</span>
        </label>
        <div className="ent-dialog-actions">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="ent-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            className="ent-btn-primary"
            style={{ background: site.accentColor }}
            onClick={() => {
              data.actions.signContract({
                orgId: site.orgId,
                contractType,
                royaltySplitArtist: requestedSplit / 100,
                switchAgency,
              });
              dialogRef.current?.close();
            }}
          >
            Sign Agreement
          </button>
        </div>
      </div>
    </dialog>
  );
}
