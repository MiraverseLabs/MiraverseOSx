import React, { useState } from 'react';
import {
  Activity, ArrowUpRight, Check, CheckCircle2, ClipboardList, HeartPulse,
  Home, Pill, ShieldAlert, Sparkles, Wind,
} from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { useMedicalStore } from '../store/useMedicalStore';
import { launchDesktopApp } from '../components/desktop/appDirectory';
import CelestialScene from '../components/desktop/CelestialScene';
import type { WellnessCheckIn } from '../gameplay/Medical';
import '../styles/apps/VitalsApp.css';

type VitalsTab = 'telemetry' | 'meds' | 'checkin' | 'stabilize';

const GROUNDING_STEPS = [
  { title: '1. Anchor Your Breath', detail: 'Inhale slowly for four counts. Let background terminal noise and PRISM static fall quiet.' },
  { title: '2. Release Aura Strain', detail: 'Hold gently for four counts. Notice tension leaving your shoulders, eyes, and pulse.' },
  { title: '3. Seal Your Baseline', detail: 'Exhale smoothly for six counts. Lock in a calm, steady bio-aura resonance for the rest of the cycle.' },
];

export default function VitalsApp() {
  const [tab, setTab] = useState<VitalsTab>('telemetry');
  const [notice, setNotice] = useState('');
  const [mood, setMood] = useState<WellnessCheckIn['mood']>('Balanced');
  const [energy, setEnergy] = useState(80);
  const [note, setNote] = useState('');
  const [groundStep, setGroundStep] = useState(0);

  const player = useOSStore(state => state.gameplay.player);
  const cycle = useOSStore(state => state.gameplay.timeCycleCount ?? 28);
  const corruption = useOSStore(state => state.gameplay.prismCorruptionLevel ?? 0);
  const setBrowserUrl = useOSStore(state => state.setBrowserUrl);

  const {
    prescriptions,
    checkIns,
    telemetryHistory,
    lastGroundingCycle,
    takeMedicationDose,
    logWellnessCheckIn,
    completeGroundingExercise,
  } = useMedicalStore();

  const auraHealth = player?.auraHealth ?? 100;
  const stamina = player?.stamina ?? 85;
  const conditions: string[] = Array.isArray(player?.conditions) ? player.conditions : [];
  const status = auraHealth < 30 ? 'Critical' : auraHealth < 70 ? 'Recovering' : 'Stable';
  const restingBpm = Math.max(56, Math.min(112, Math.round(64 + (100 - auraHealth) * 0.35 + corruption * 0.15)));
  const ringLength = 2 * Math.PI * 81;

  const openFaithMed = (path = '') => {
    setBrowserUrl(`https://faithmed.aure${path}`);
    launchDesktopApp('browser');
  };

  const applyBioBoost = (auraDelta: number, staminaDelta: number, clearCondition?: string) => {
    useOSStore.setState(s => {
      const p = s.gameplay.player;
      const nextConditions = clearCondition
        ? (p.conditions || []).filter((c: string) => c.toLowerCase() !== clearCondition.toLowerCase())
        : p.conditions || [];
      return {
        gameplay: {
          ...s.gameplay,
          player: {
            ...p,
            auraHealth: Math.min(100, Math.max(0, (p.auraHealth ?? 100) + auraDelta)),
            stamina: Math.min(100, Math.max(0, (p.stamina ?? 85) + staminaDelta)),
            conditions: nextConditions,
          },
        },
      };
    });
  };

  const handleTakeDose = (productId: string) => {
    const res = takeMedicationDose(productId);
    if (res.ok) {
      applyBioBoost(res.auraBoost || 0, res.staminaBoost || 0, res.clearsCondition);
    }
    setNotice(res.message);
  };

  const handleLogCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    logWellnessCheckIn({ mood, energy, note, cycle, aura: auraHealth, stamina, prism: corruption });
    setNote('');
    setNotice(`Logged ${mood} wellness check-in (synced to Faith Medical Patient Portal).`);
  };

  const handleGroundingAdvance = () => {
    if (groundStep < GROUNDING_STEPS.length - 1) {
      setGroundStep(s => s + 1);
      return;
    }
    const res = completeGroundingExercise(cycle);
    if (res.ok) applyBioBoost(10, 8);
    setNotice(res.message);
    setGroundStep(0);
  };

  const totalDoses = prescriptions.reduce((sum, p) => sum + p.dosesRemaining, 0);

  return (
    <section className="vitals-workspace" aria-label="VITALS bio-aura monitor">
      <header className="vitals-heading">
        <div>
          <span className="mira-eyebrow">VITALS / PERSONAL WEARABLE & HEALTH DASHBOARD</span>
          <h1>A little closer to balance.</h1>
          <p>Live bio-aura telemetry, Faith Pharmacy remedies, wellness check-ins, and recovery.</p>
        </div>
        <span className="vitals-live"><i /> {restingBpm} BPM · Live</span>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }} aria-label="VITALS sections">
        {[
          { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
          { id: 'meds', label: `Medications (${totalDoses})`, icon: Pill },
          { id: 'checkin', label: 'Wellness Log', icon: ClipboardList },
          { id: 'stabilize', label: 'Aura Stabilization', icon: Wind },
        ].map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(item.id as VitalsTab)}
              className={`mira-button ${active ? 'mira-button--primary' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px' }}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </nav>

      {notice && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#e0f5f2',
            border: '1px solid #5bb5aa',
            color: '#0b3b3c',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      {/* TAB 1: LIVE TELEMETRY */}
      {tab === 'telemetry' && (
        <>
          <div className="vitals-layout">
            <article className="vitals-aura-card" data-status={status.toLowerCase()}>
              <div className="vitals-card-label">
                <HeartPulse size={17} />
                <h2>Aura integrity</h2>
                <span className="vitals-status">{status}</span>
              </div>
              <div className="vitals-gauge" role="progressbar" aria-label="Aura integrity" aria-valuenow={auraHealth} aria-valuemin={0} aria-valuemax={100}>
                <svg viewBox="0 0 210 210" aria-hidden="true">
                  <circle className="vitals-gauge-halo" cx="105" cy="105" r="96" />
                  <circle className="vitals-gauge-track" cx="105" cy="105" r="81" />
                  <circle
                    className="vitals-gauge-value"
                    cx="105"
                    cy="105"
                    r="81"
                    strokeDasharray={ringLength}
                    strokeDashoffset={ringLength * (1 - Math.min(100, Math.max(0, auraHealth)) / 100)}
                  />
                  <path className="vitals-pulse" d="M76 115h13l7-13 10 26 10-33 9 20h10" />
                </svg>
                <div className="vitals-gauge-number" aria-hidden="true">
                  <strong>{auraHealth}<small>%</small></strong>
                  <span>AURA INTEGRITY</span>
                </div>
              </div>
              <div className="vitals-citizen">
                <span>{(player?.name || 'Citizen').slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{player?.name || 'Provisional Citizen'}</strong>
                  <small>Stamina {stamina}% · Resting {restingBpm} BPM</small>
                </div>
                <Activity size={18} />
              </div>
              <p className="vitals-aura-note">
                {auraHealth < 70
                  ? 'Your aura needs recovery. Take a remedy, run Aura Stabilization, or rest in Suite 4B.'
                  : 'Your bio-aura is holding steady. Log a daily wellness check-in to track multi-cycle trends.'}
              </p>
            </article>

            <div className="vitals-detail-stack">
              <article className="vitals-exposure-card">
                <CelestialScene className="vitals-exposure-art" />
                <div className="vitals-card-label">
                  <ShieldAlert size={16} />
                  <h2>World PRISM exposure</h2>
                </div>
                <div className="vitals-exposure-number">{corruption}<span>%</span></div>
                <progress className="vitals-exposure-meter" aria-label="PRISM corruption" value={corruption} max={100} />
                <p>World corruption rises at night. Review your aura after field work.</p>
              </article>

              <article className="vitals-conditions-card">
                <div className="vitals-card-label">
                  <h2>Active conditions</h2>
                  <span className="vitals-condition-count">{conditions.length.toString().padStart(2, '0')}</span>
                </div>
                {conditions.length ? (
                  <ul>
                    {conditions.map(condition => (
                      <li key={condition}>
                        <span className="vitals-condition-dot" />
                        <strong>{condition}</strong>
                        <button
                          type="button"
                          onClick={() => setTab('meds')}
                          style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#0d6e6e', background: 'transparent', border: 0, cursor: 'pointer' }}
                        >
                          Treat →
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vitals-clear"><Check size={16} /> No active conditions. Your record is clear.</p>
                )}
              </article>
            </div>
          </div>

          {/* Multi-Cycle Aura & Stamina Trend Chart */}
          <section
            style={{
              marginTop: 18,
              background: '#ffffff',
              border: '1px solid #d7e5e5',
              borderRadius: 14,
              padding: 18,
            }}
            aria-label="Multi-cycle Aura and Stamina trends"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Multi-Cycle Bio-Aura & Stamina Trend</strong>
              <span style={{ fontSize: 11, color: '#516c70' }}>Teal: Aura · Indigo: Stamina</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${telemetryHistory.length}, 1fr)`, gap: 10, alignItems: 'end', height: 96 }}>
              {telemetryHistory.map((pt, i) => (
                <div key={`${pt.label}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72 }}>
                    <div title={`Aura ${pt.aura}%`} style={{ width: 12, height: `${Math.max(8, pt.aura * 0.7)}px`, background: '#0d6e6e', borderRadius: 4 }} />
                    <div title={`Stamina ${pt.stamina}%`} style={{ width: 12, height: `${Math.max(8, pt.stamina * 0.7)}px`, background: '#6366f1', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#516c70' }}>{pt.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* TAB 2: MEDICATIONS & REMEDIES */}
      {tab === 'meds' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Prescriptions & Aura Remedies</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#516c70' }}>
                Take doses filled at Faith Pharmacy to restore Aura/Stamina or clear active conditions.
              </p>
            </div>
            <button className="mira-button mira-button--primary" onClick={() => openFaithMed('/pharmacy')}>
              <Pill size={14} /> Refill at Faith Pharmacy <ArrowUpRight size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {prescriptions.map(rx => (
              <article key={rx.productId} style={{ background: '#fff', border: '1px solid #d7e5e5', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{rx.name}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: rx.dosesRemaining > 0 ? '#e0f5f2' : '#fee2e2', color: rx.dosesRemaining > 0 ? '#0b3b3c' : '#991b1b' }}>
                    {rx.dosesRemaining} doses left
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#466064' }}>
                  +{rx.auraBoost}% Aura · +{rx.staminaBoost} Stamina
                  {rx.clearsCondition ? ` · Clears ${rx.clearsCondition}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Last filled: {rx.lastFilledAt}{rx.lastTakenAt ? ` · Last taken: ${rx.lastTakenAt}` : ''}
                </div>
                <button
                  type="button"
                  disabled={rx.dosesRemaining <= 0}
                  onClick={() => handleTakeDose(rx.productId)}
                  className="mira-button mira-button--primary"
                  style={{ marginTop: 'auto' }}
                >
                  <CheckCircle2 size={14} /> {rx.dosesRemaining > 0 ? 'Take 1 Dose' : 'Empty — Refill Needed'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: DAILY WELLNESS CHECK-IN */}
      {tab === 'checkin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
          <form
            onSubmit={handleLogCheckIn}
            style={{ background: '#fff', border: '1px solid #d7e5e5', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 style={{ margin: 0, fontSize: 17 }}>Daily Wellness Check-In</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600 }}>
              How does your bio-aura feel?
              <select value={mood} onChange={e => setMood(e.target.value as WellnessCheckIn['mood'])} style={{ padding: 8, borderRadius: 7, border: '1px solid #cbd5e1' }}>
                <option value="Balanced">Balanced</option>
                <option value="Energized">Energized</option>
                <option value="Fatigued">Fatigued</option>
                <option value="Strained">Strained</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600 }}>
              Energy Level: {energy}%
              <input type="range" min={10} max={100} value={energy} onChange={e => setEnergy(Number(e.target.value))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600 }}>
              Notes (synced with Faith Medical Patient Portal)
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Sleep quality, field exposure, study fatigue…"
                style={{ padding: 8, borderRadius: 7, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
              />
            </label>
            <button type="submit" className="mira-button mira-button--primary">Save Wellness Check-In</button>
          </form>

          <section style={{ background: '#fff', border: '1px solid #d7e5e5', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Health Timeline ({checkIns.length})</h2>
            {checkIns.slice(0, 6).map(entry => (
              <div key={entry.id} style={{ borderBottom: '1px solid #e6f0f0', paddingBottom: 8, fontSize: 12.5 }}>
                <strong>{entry.mood}</strong> · Energy {entry.energy}% · <span style={{ color: '#64748b' }}>{entry.at}</span>
                <div style={{ color: '#334155', marginTop: 2 }}>{entry.note}</div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* TAB 4: GUIDED AURA STABILIZATION */}
      {tab === 'stabilize' && (
        <section style={{ background: '#fff', border: '1px solid #d7e5e5', borderRadius: 14, padding: 24, maxWidth: 640 }}>
          <span className="mira-eyebrow">GUIDED RECOVERY · ONCE PER CYCLE</span>
          <h2 style={{ margin: '6px 0 10px', fontSize: 20 }}>
            <Sparkles size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Aura Stabilization Exercise
          </h2>
          {lastGroundingCycle === cycle ? (
            <p style={{ fontSize: 13.5, color: '#0d6e6e', fontWeight: 600 }}>
              <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Completed for Cycle {cycle}. Your baseline resonance is steady.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 12, background: '#eef7f7', border: '1px solid #b9e2df' }}>
                <strong style={{ display: 'block', fontSize: 15, color: '#0b3b3c', marginBottom: 6 }}>
                  {GROUNDING_STEPS[groundStep].title}
                </strong>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: '#274c50' }}>
                  {GROUNDING_STEPS[groundStep].detail}
                </p>
              </div>
              <button type="button" className="mira-button mira-button--primary" onClick={handleGroundingAdvance}>
                {groundStep === GROUNDING_STEPS.length - 1 ? 'Complete Stabilization (+10% Aura, +8 Stamina)' : 'Next Breath Step →'}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="vitals-recovery" aria-labelledby="vitals-recovery-title" style={{ marginTop: 18 }}>
        <span className="vitals-recovery-icon"><Home size={21} /></span>
        <div>
          <h2 id="vitals-recovery-title">Make room for recovery.</h2>
          <p>Rest in My Home · Suite 4B to restore aura, or visit Faith Medical for appointments & pharmacy refills.</p>
        </div>
        <div className="vitals-recovery-actions">
          <button className="mira-button" onClick={() => launchDesktopApp('housing')}>My Home <ArrowUpRight size={15} /></button>
          <button className="mira-button mira-button--primary" onClick={() => openFaithMed('/patient-portal')}>
            Faith Medical <ArrowUpRight size={15} />
          </button>
        </div>
      </section>

      <footer className="vitals-footer">
        <span><i /> In-world bio-aura telemetry</span>
        <span>FAITH MEDICAL · AURELINE</span>
      </footer>
    </section>
  );
}
