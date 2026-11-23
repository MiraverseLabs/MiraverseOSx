import React, { useState } from 'react';
import {
  AlertTriangle, Archive, ChevronDown, ChevronRight, Clock, FileEdit,
  Inbox, Package, Send, Settings, Shield, Sparkles, Star, Tag as PinLabel, Trash2, Users,
} from 'lucide-react';
import { AppSidebar } from '../../components/ui/app-shell';
import type { AureMailAccount } from '../../data/commsData';
import { senderAccess } from '../../integration/communicationsAccess';

export interface FolderItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count: number;
}

interface MailSidebarProps {
  isComposing: boolean;
  onToggleCompose: () => void;
  activeFolder: string;
  onSelectFolder: (folder: string) => void;
  onDropMail: (event: React.DragEvent, folder: string) => void;
  primaryFolders: FolderItem[];
  secondaryFolders: FolderItem[];
  customFolders: FolderItem[];
  labelFolders: FolderItem[];
  activeAccountScope: string;
  onSelectAccountScope: (scope: string) => void;
  playerAccounts: AureMailAccount[];
  communicationsPlayer: any;
  directoryCount: number;
  onOpenContacts: () => void;
  onOpenSettings: () => void;
  onOpenAccess: () => void;
  onOpenPostalApp: () => void;
}

const ACCOUNT_PILLS = [
  { id: 'ALL', label: 'All Mail' },
  { id: 'personal', label: 'Personal' },
  { id: 'academic', label: 'Academic .edu' },
  { id: 'work', label: 'Work & Gov' },
];

export default function MailSidebar({
  isComposing,
  onToggleCompose,
  activeFolder,
  onSelectFolder,
  onDropMail,
  primaryFolders,
  secondaryFolders,
  customFolders,
  labelFolders,
  activeAccountScope,
  onSelectAccountScope,
  playerAccounts,
  communicationsPlayer,
  directoryCount,
  onOpenContacts,
  onOpenSettings,
  onOpenAccess,
  onOpenPostalApp,
}: MailSidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const renderFolderBtn = (f: FolderItem) => {
    const IconComp = f.icon;
    return (
      <button
        key={f.id}
        type="button"
        onDragOver={event => event.preventDefault()}
        onDrop={event => onDropMail(event, f.id)}
        onClick={() => onSelectFolder(f.id)}
        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
          activeFolder === f.id
            ? 'bg-[#e9ebf6] font-bold text-[#1d2650] shadow-2xs'
            : 'text-slate-600 hover:bg-[#f2f3fb]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComp size={14} className={activeFolder === f.id ? 'text-[#5f6ab0] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">{f.label}</span>
        </div>
        {f.count > 0 && (
          <span
            className={`text-[10px] font-mono rounded px-1.5 py-0.2 shrink-0 ${
              activeFolder === f.id ? 'bg-[#5f6ab0] text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {f.count}
          </span>
        )}
      </button>
    );
  };

  return (
    <AppSidebar className="mail-folders w-[23%] min-w-52 max-w-60 shrink-0 p-3 space-y-3.5 overflow-y-auto" label="Email folders and accounts">
      {/* Compose CTA */}
      <button
        type="button"
        onClick={onToggleCompose}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17213f] to-[#3a497b] py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition cursor-pointer"
      >
        <Sparkles size={14} className="text-purple-300" /> {isComposing ? 'Close Composer' : 'New Email'}
      </button>

      {/* Account Scope Switcher Pills */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 px-1">
          Email Accounts
        </div>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Account scope filter">
          {ACCOUNT_PILLS.map(pill => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={activeAccountScope === pill.id}
              onClick={() => onSelectAccountScope(pill.id)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                activeAccountScope === pill.id
                  ? 'bg-[#17213f] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        {playerAccounts.length > 1 && (
          <details className="pt-0.5">
            <summary className="cursor-pointer px-1 text-[10px] font-semibold text-slate-500">
              Linked addresses ({playerAccounts.length})
            </summary>
            <div className="mt-1 space-y-1">
              {playerAccounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectAccountScope(acc.address)}
                  className={`w-full rounded-lg px-2 py-1 text-left text-[10.5px] transition ${
                    activeAccountScope === acc.address
                      ? 'bg-indigo-100 font-bold text-indigo-950'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate font-mono">{acc.address}</div>
                  <div className="truncate text-[9.5px] text-slate-400">
                    {senderAccess(communicationsPlayer, acc) ? 'Active sender' : 'Read-only'}
                  </div>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Core Folders */}
      <div className="space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 mb-1 px-1">
          Folders
        </div>
        {primaryFolders.map(renderFolderBtn)}
      </div>

      {/* Collapsible System & Custom Folders */}
      <div className="space-y-0.5 border-t border-slate-200 pt-2">
        <button
          type="button"
          onClick={() => setMoreOpen(v => !v)}
          className="flex w-full items-center gap-1.5 px-1 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {moreOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>More Folders & Labels</span>
        </button>
        {moreOpen && (
          <div className="space-y-0.5 pt-0.5">
            {secondaryFolders.map(renderFolderBtn)}
            {customFolders.map(renderFolderBtn)}
            {labelFolders.map(renderFolderBtn)}
          </div>
        )}
      </div>

      {/* Physical Mail / Packages Separation Callout */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
          <Package size={12} /> Physical Parcels & Post
        </div>
        <p className="text-[10.5px] text-amber-900/80 leading-snug m-0">
          AureMail is digital email. Open Meridion Post for physical packages, tracking, and wax-sealed letters.
        </p>
        <button
          type="button"
          onClick={onOpenPostalApp}
          className="w-full rounded-lg bg-amber-800 hover:bg-amber-900 text-white py-1.5 text-[11px] font-bold transition cursor-pointer"
        >
          Open Meridion Post →
        </button>
      </div>

      {/* Utilities */}
      <div className="border-t border-slate-200 pt-2.5 space-y-1">
        <button
          type="button"
          onClick={() => onSelectFolder(activeFolder === 'directory' ? 'inbox' : 'directory')}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
            activeFolder === 'directory' ? 'bg-indigo-50 font-bold text-indigo-900' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={13} /> Directory ({directoryCount})
        </button>
        <button
          type="button"
          onClick={onOpenContacts}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <Users size={13} /> Personal Contacts
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <Settings size={13} /> Rules & Settings
        </button>
        <button
          type="button"
          onClick={onOpenAccess}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <Shield size={13} /> Accounts & Access
        </button>
      </div>
    </AppSidebar>
  );
}

export const SIDEBAR_ICONS = {
  Inbox,
  Star,
  Send,
  FileEdit,
  Clock,
  Archive,
  AlertTriangle,
  Trash2,
  PinLabel,
};
