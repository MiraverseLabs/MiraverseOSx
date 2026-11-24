import React from 'react';
import { Radio, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import NoticeBoardApp from '../../NoticeBoardApp';
import { useOSStore } from '../../../store/useOSStore';

export default function WorknetCivicNotices() {
  const player = useOSStore(s => s.gameplay.player);
  const completedNoticeIds = player?.completedNoticeIds || [];
  const activeOrders = Object.values(player?.worknetOrders || {}).filter((o: any) => o.status === 'active').length;
  const clearance = player?.clearanceLevel ?? 2;

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-[#faf8f5]">
      <header className="wn-bulletins-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio size={14} style={{ color: 'var(--wn-inst-accent)' }} />
            <span className="worknet-kicker">Meridion Public Commissions & Field Exchange</span>
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 mt-0.5 leading-tight">
            Field Bulletins & Public Directives
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Active municipal directives, neighborhood commissions, and public-domain assistance postings across Aureline.
          </p>
        </div>

        <div className="wn-bulletins-stats">
          <div className="wn-bulletins-pill">
            <FileText size={12} />
            <span>Active Orders</span>
            <strong>{activeOrders}</strong>
          </div>
          <div className="wn-bulletins-pill">
            <CheckCircle2 size={12} />
            <span>Bulletins Cleared</span>
            <strong>{completedNoticeIds.length}</strong>
          </div>
          <div className="wn-bulletins-pill">
            <ShieldCheck size={12} />
            <span>Access</span>
            <strong>Tier {clearance} · Public</strong>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <NoticeBoardApp />
      </div>
    </div>
  );
}
