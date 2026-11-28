// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Key, User, ShieldAlert, LogIn, Lock, ArrowRight, UserPlus, Home, Wallet } from 'lucide-react';
import Button from './button';
import Input from './input';
import { useOSStore } from '../../store/useOSStore';
import { LINEAGE_RECORDS } from '../../game-content/species/registry';
import {
  STARTER_BACKGROUNDS,
  STARTER_RESIDENCES,
  REALM_REGION_CODES,
} from '../../gameplay/FreshPlayerSave';

import videoAnomaly from '../../assets/videos/everything_is_great_but_do_not.mp4';
import videoSurveillance from '../../assets/videos/mixkit-a-woman-monitoring-close-circuit-surveillance-23673-hd-ready.mp4';
import videoInk from '../../assets/videos/mixkit-black-ink-splashing-505-hd-ready.mp4';
import videoLandscape from '../../assets/videos/mixkit-flying-over-a-relaxing-creek-full-of-rock-on-the-51585-hd-ready.mp4';
import videoGlitter from '../../assets/videos/mixkit-glitter-stars-and-snowflakes-19007-hd-ready.mp4';

const VIDEO_FEEDS = [
  { id: 'glitter', name: 'Aether Glitter Stars', src: videoGlitter, label: 'Celestial Aura Feed' },
  { id: 'surveillance', name: 'DGA Surveillance Monitor', src: videoSurveillance, label: 'Security Feed #09' },
  { id: 'ink', name: 'Veil Ink Splash', src: videoInk, label: 'PRISM Anomaly' },
  { id: 'anomaly', name: 'System Anomaly Intercept', src: videoAnomaly, label: 'Sub-Conduit Signal' },
  { id: 'landscape', name: 'Meridion High-Realm', src: videoLandscape, label: 'Celestial Landscape' },
];

export default function LoginScreen({ onLoginSuccess, initialMode = 'login', onBackToLanding }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('CY-9021-PLAYER');
  const [password, setPassword] = useState('••••••••');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeVideoId] = useState('glitter');
  const [isMuted] = useState(true);
  const [isBooting, setIsBooting] = useState(false);

  // Guided Fresh Character Onboarding state
  const [newName, setNewName] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newPronouns, setNewPronouns] = useState('');
  const [newRealm, setNewRealm] = useState('Orynvell');
  const [newSpeciesId, setNewSpeciesId] = useState('MR-211');
  const [newResidenceId, setNewResidenceId] = useState(STARTER_RESIDENCES[0].id);
  const [newBackgroundId, setNewBackgroundId] = useState(STARTER_BACKGROUNDS[0].id);

  const handleCreateFreshCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isBooting) return;
    setIsBooting(true);
    setStatusMsg('⚡ ARCHIVING PRIOR PROGRESS & ALLOCATING FRESH AURA IDENTITY...');
    try {
      const result = await useOSStore.getState().startFreshPlayerSave({
        displayName: newName.trim(),
        alias: newAlias.trim() || undefined,
        pronouns: newPronouns.trim() || undefined,
        homeRealm: newRealm,
        speciesId: newSpeciesId || undefined,
        residenceId: newResidenceId,
        backgroundId: newBackgroundId,
      });
      setStatusMsg(`✓ ${result.message}`);
      setTimeout(() => {
        onLoginSuccess?.({
          name: newName.trim(),
          isAdmin: false,
          freshSave: true,
          maid: result.maid,
        });
      }, 600);
    } catch (err: any) {
      setStatusMsg(err?.message || 'Could not initialize fresh character save.');
      setIsBooting(false);
    }
  };

  const activeVideo = VIDEO_FEEDS.find((v) => v.id === activeVideoId) || VIDEO_FEEDS[0];

  const handleStandardLogin = (e) => {
    e?.preventDefault();
    if (!username.trim() || isBooting) return;
    setIsBooting(true);
    const isAdminUser = username.trim().toLowerCase() === 'admin' || username.trim().toLowerCase() === 'administrator' || username.trim().toLowerCase() === 'root';
    
    setStatusMsg(isAdminUser ? '⚡ ROOT ADMINISTRATOR AUTHENTICATING...' : '⚡ INITIALIZING CITIZEN LOGIN BOOT SEQUENCE...');

    setTimeout(() => {
      setStatusMsg(isAdminUser ? '✓ ROOT BIOMETRICS & MASTER KEYS VERIFIED' : '✓ BIOMETRICS & ASSET CREDENTIALS VERIFIED');
    }, 800);

    setTimeout(() => {
      onLoginSuccess({
        name: isAdminUser ? 'ADMINISTRATOR' : username.trim(),
        isAdmin: isAdminUser,
        clearance: isAdminUser ? 5 : 1,
        credits: isAdminUser ? 99999 : 500,
        bits: isAdminUser ? 9999 : 25,
        level: isAdminUser ? 99 : 1,
      });
    }, 1500);
  };

  const handleAdminBypass = () => {
    setIsBooting(true);
    setStatusMsg('⚡ ROOT ADMIN BYPASS ENGAGED — Master Clearance Level 05 Unlocked');
    setTimeout(() => {
      onLoginSuccess({
        name: 'ADMINISTRATOR',
        isAdmin: true,
        clearance: 5,
        credits: 99999,
        bits: 9999,
        level: 99,
      });
    }, 800);
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#070514] overflow-hidden select-none font-sans">
      
      {/* ── BACKGROUND LIVE VIDEO FEED (ASSET FOLDER VIDEOS) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          key={activeVideo.id}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="h-full w-full object-cover opacity-35 scale-105 transition-opacity duration-1000 blur-[1px]"
        >
          <source src={activeVideo.src} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(49,93,158,0.35)_0%,rgba(20,40,80,0.85)_85%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-25 holo-grid" />
      </div>

      {/* ── MAIN HOLOGRAPHIC LOGIN & BOOT CONTAINER ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 w-full max-w-md rounded-3xl bg-[#1E3D75]/92 backdrop-blur-2xl p-8 shadow-[0_24px_80px_rgba(12,25,54,0.75),0_0_35px_rgba(229,195,112,0.25)] text-white border border-white/30 font-ui"
      >
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#315D9E]/60 border border-[#E5C370]/50 text-[#E5C370] shadow-[0_0_20px_rgba(229,195,112,0.35)]">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide text-[#FFFFFF] drop-shadow-[0_0_12px_rgba(229,195,112,0.35)]">
              MiraverseOSx
            </h1>
            <p className="text-[10px] font-ui tracking-[0.25em] text-[#FBE6AB] mt-1 uppercase font-bold">
              CELESTIAL OPERATING SYSTEM • BOOT VER 5.3
            </p>
          </div>
        </div>

        {/* Tab Switcher: Login / Register */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#142850]/80 p-1 border border-white/15 mb-6 text-xs font-semibold">
          <button
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg transition ${mode === 'login' ? 'bg-[#E5C370] text-[#0E1A33] font-bold shadow-md' : 'text-white/70 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg transition ${mode === 'register' ? 'bg-[#E5C370] text-[#0E1A33] font-bold shadow-md' : 'text-white/70 hover:text-white'}`}
          >
            New Character (Fresh Save)
          </button>
        </div>

        {mode === 'register' ? (
          <form onSubmit={handleCreateFreshCharacter} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
            <p className="text-[11px] text-[#D5E2F5] leading-relaxed bg-[#142850]/70 border border-white/15 rounded-xl p-2.5">
              Archives any current Administrator or prior save safely, issues one AURA MAID, registers your residence, initializes starting finances, and opens personal comms.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#FBE6AB] uppercase font-bold">Character Name *</label>
                <Input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lyra Solis" className="bg-[#142850]/85 border-[#315D9E] text-white text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#FBE6AB] uppercase font-bold">Comms Alias</label>
                <Input type="text" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="@lyra.solis" className="bg-[#142850]/85 border-[#315D9E] text-white text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#FBE6AB] uppercase font-bold">Home Realm</label>
                <select value={newRealm} onChange={(e) => setNewRealm(e.target.value)} className="w-full rounded-lg bg-[#142850] border border-[#315D9E] text-white text-xs px-2.5 py-2">
                  {Object.keys(REALM_REGION_CODES).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#FBE6AB] uppercase font-bold">Pronouns</label>
                <Input type="text" value={newPronouns} onChange={(e) => setNewPronouns(e.target.value)} placeholder="Optional" className="bg-[#142850]/85 border-[#315D9E] text-white text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[#FBE6AB] uppercase font-bold">Species / Lineage</label>
              <select value={newSpeciesId} onChange={(e) => setNewSpeciesId(e.target.value)} className="w-full rounded-lg bg-[#142850] border border-[#315D9E] text-white text-xs px-2.5 py-2">
                <option value="">Choose later in My Character</option>
                {LINEAGE_RECORDS.slice(0, 60).map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name} · {sp.realm} ({sp.category})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[#FBE6AB] uppercase font-bold flex items-center gap-1"><Home size={11} /> Starter Residence</label>
              <select value={newResidenceId} onChange={(e) => setNewResidenceId(e.target.value)} className="w-full rounded-lg bg-[#142850] border border-[#315D9E] text-white text-xs px-2.5 py-2">
                {STARTER_RESIDENCES.map(res => (
                  <option key={res.id} value={res.id}>{res.name} ({res.city})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[#FBE6AB] uppercase font-bold flex items-center gap-1"><Wallet size={11} /> Starting Background &amp; Finances</label>
              <select value={newBackgroundId} onChange={(e) => setNewBackgroundId(e.target.value)} className="w-full rounded-lg bg-[#142850] border border-[#315D9E] text-white text-xs px-2.5 py-2">
                {STARTER_BACKGROUNDS.map(bg => (
                  <option key={bg.id} value={bg.id}>{bg.label} — {bg.credits} cr / {bg.bits} bits</option>
                ))}
              </select>
            </div>
            {statusMsg && (
              <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/50 p-2.5 text-center text-xs text-cyan-200 font-mono">
                {statusMsg}
              </div>
            )}
            <Button
              type="submit"
              disabled={isBooting || !newName.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 font-bold text-xs text-[#0B1426] hover:from-emerald-300 hover:to-cyan-400 transition flex items-center justify-center gap-2"
            >
              <UserPlus size={15} /> Archive Prior Save &amp; Start Fresh Character
            </Button>
          </form>
        ) : (
        /* Login Form */
        <form onSubmit={handleStandardLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-ui text-[#FBE6AB] uppercase tracking-wider flex items-center gap-1 font-bold">
              <User size={12} /> Asset Handle / Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. CY-9021-PLAYER or admin"
              required
              className="bg-[#142850]/85 border-[#315D9E] text-white placeholder-[#D5E2F5]/60 font-ui"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-ui text-[#FBE6AB] uppercase tracking-wider flex items-center gap-1 font-bold">
              <Key size={12} /> Cipher Passkey
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-[#142850]/85 border-[#315D9E] text-white placeholder-[#D5E2F5]/60 font-ui"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-cyan-300/80 uppercase tracking-wider flex items-center gap-1">
              <Lock size={12} /> Access Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/60 border-cyan-500/30 text-cyan-200 text-xs"
              required
            />
          </div>

          {statusMsg && (
            <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/50 p-3 text-center text-xs text-cyan-300 font-mono animate-pulse">
              {statusMsg}
            </div>
          )}

          <Button
            type="submit"
            disabled={isBooting}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-xs text-black hover:from-cyan-400 hover:to-indigo-500 transition shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
          >
            <LogIn size={15} /> START LOGIN BOOT
          </Button>
        </form>
        )}

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cyan-500/20" /></div>
          <span className="relative bg-[#0b0c1e] px-3 text-[9px] font-mono text-cyan-300/50 uppercase tracking-widest">OR</span>
        </div>

        {/* ⚡ INSTANT ADMIN ACCESS BUTTON (Prominent at Bottom) */}
        <button
          onClick={handleAdminBypass}
          disabled={isBooting}
          className="w-full rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 p-3.5 text-amber-300 font-bold text-xs hover:bg-amber-400/30 hover:border-amber-300 transition-all duration-200 shadow-[0_0_20px_rgba(251,191,36,0.2)] flex items-center justify-center gap-2 group"
          title="Bypass login and open MiraverseOSx with Administrator Level 4 Clearance"
        >
          <ShieldAlert size={16} className="text-amber-400 group-hover:animate-bounce" />
          <span>⚡ ADMIN INSTANT ACCESS (BYPASS)</span>
          <ArrowRight size={14} className="text-amber-400 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}
