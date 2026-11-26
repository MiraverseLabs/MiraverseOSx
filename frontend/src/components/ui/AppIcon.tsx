import { useState } from 'react';
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        className={className}
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}