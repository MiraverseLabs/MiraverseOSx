import { CheckCircle2, X } from 'lucide-react';

export function SiteFeedbackBanner({
  message,
  onDismiss,
  accentColor,
}: {
  message: string;
  onDismiss: () => void;
  accentColor?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="ent-feedback-banner"
      style={accentColor ? { borderInlineStartColor: accentColor } : undefined}
    >
      <span className="ent-feedback-text">
        <CheckCircle2 size={15} aria-hidden="true" />
        <span>{message}</span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ent-feedback-close"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
