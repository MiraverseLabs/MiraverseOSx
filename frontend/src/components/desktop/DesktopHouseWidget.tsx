import React, { useState } from 'react';
import { ArrowUpRight, Moon, Package } from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { usePostalStore } from '../../store/usePostalStore';
import { launchDesktopApp } from './appDirectory';

export default function DesktopHouseWidget() {
  const player = useOSStore(s => s.gameplay.player);
  const restInDorm = useOSStore(s => s.restInDorm);
  const openAppWorkspace = useOSStore(s => s.openAppWorkspace);
  const shipments = usePostalStore(s => s.shipments);
  const [napNote, setNapNote] = useState('');

  const stamina = Math.max(0, Math.min(100, player?.stamina ?? 85));
  const comfort = Math.max(0, Math.min(100, player?.roomComfort ?? player?.dormComfort ?? 50));
  const hasAuraLamp = (player?.unlockedHousingUpgrades || []).includes('aura_lamp');
  const waitingParcels = shipments.filter(s => s.direction === 'incoming' && s.status === 'delivered' && !s.opened).length;

  const handleQuickNap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = restInDorm('short');
    setNapNote(res?.message ? 'Rested (+Stamina)' : 'Quick nap complete');
    window.setTimeout(() => setNapNote(''), 2800);
  };

  return (
    <section className="desktop-house-widget" aria-label="My Home · Suite 4B widget">
      <button
        type="button"
        className="desktop-house-hero"
        onClick={() => launchDesktopApp('housing')}
        aria-label="Enter My Home · Suite 4B"
      >
        <svg className="desktop-house-svg" viewBox="0 0 120 84" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="houseGlow" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor={hasAuraLamp ? '#fde68a' : '#fef3c7'} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Chimney */}
          <rect x="82" y="14" width="11" height="20" rx="2" fill="#8b5e54" />
          {/* Roof */}
          <path d="M12 42L60 10L108 42H12Z" fill="#7c3f4a" stroke="#f8e8dc" strokeWidth="2" strokeLinejoin="round" />
          {/* House Body */}
          <rect x="22" y="40" width="76" height="38" rx="4" fill="#fffaf3" stroke="#d9c6b4" strokeWidth="2" />
          {/* Window Warm Glow */}
          <circle cx="42" cy="56" r="14" fill="url(#houseGlow)" />
          <circle cx="78" cy="56" r="14" fill="url(#houseGlow)" />
          {/* Left & Right Windows */}
          <rect x="33" y="48" width="17" height="15" rx="3" fill={hasAuraLamp ? '#fcd34d' : '#fde68a'} stroke="#8c6258" strokeWidth="1.6" />
          <path d="M41.5 48V63M33 55.5H50" stroke="#8c6258" strokeWidth="1.2" />
          <rect x="70" y="48" width="17" height="15" rx="3" fill={hasAuraLamp ? '#fcd34d' : '#fde68a'} stroke="#8c6258" strokeWidth="1.6" />
          <path d="M78.5 48V63M70 55.5H87" stroke="#8c6258" strokeWidth="1.2" />
          {/* Door */}
          <path d="M54 78V58C54 55.8 55.8 54 58 54H62C64.2 54 66 55.8 66 58V78H54Z" fill="#8c4a3e" />
          <circle cx="63" cy="67" r="1.4" fill="#fde68a" />
          {/* Attic Circle Window */}
          <circle cx="60" cy="29" r="5" fill="#fde68a" stroke="#f8e8dc" strokeWidth="1.4" />
        </svg>
        <div className="desktop-house-title">
          <strong>My Home · Suite 4B</strong>
          <span>Vector House · Aureline</span>
        </div>
      </button>

      <div className="desktop-house-bars">
        <div className="desktop-house-meter">
          <div><span>Stamina</span><strong>{stamina}%</strong></div>
          <div className="desktop-house-track"><div style={{ width: `${stamina}%`, background: '#3b82f6' }} /></div>
        </div>
        <div className="desktop-house-meter">
          <div><span>Comfort</span><strong>{comfort}%</strong></div>
          <div className="desktop-house-track"><div style={{ width: `${comfort}%`, background: '#d97706' }} /></div>
        </div>
      </div>

      {waitingParcels > 0 && (
        <button
          type="button"
          className="desktop-house-parcel"
          onClick={() => openAppWorkspace('post', 'locker')}
        >
          <Package size={12} />
          <span>{waitingParcels} {waitingParcels === 1 ? 'delivery' : 'deliveries'} at doorstep</span>
        </button>
      )}

      {napNote && <div className="desktop-house-toast" role="status">{napNote}</div>}

      <div className="desktop-house-actions">
        <button type="button" onClick={handleQuickNap} title="Take a quick nap (+1 segment)">
          <Moon size={12} /> Quick Nap
        </button>
        <button type="button" className="is-primary" onClick={() => launchDesktopApp('housing')}>
          Enter Home <ArrowUpRight size={12} />
        </button>
      </div>
    </section>
  );
}
