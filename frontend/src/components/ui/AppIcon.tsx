import type { LucideIcon } from 'lucide-react';
import { iconAssetFor } from '../../data/designAssets';

export default function AppIcon({
  appId,
  icon: Icon,
  size = 24,
  strokeWidth = 1.6,
  className = '',
}: {
  appId: string;
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const src = iconAssetFor(appId);
  if (src) {
    return (
      <img
        className={className}
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  }
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}