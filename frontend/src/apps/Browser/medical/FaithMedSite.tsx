import React, { useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, Calendar, CheckCircle2, FileText,
  HeartPulse, MapPin, Package, Pill, ShieldCheck, Stethoscope,
} from 'lucide-react';
import {
  FAITH_DEPARTMENTS,
  FAITH_DOCTORS,
  FAITH_PHARMACY_CATALOG,
} from '../../../gameplay/Medical';
import { useMedicalStore } from '../../../store/useMedicalStore';
import { useOSStore } from '../../../store/useOSStore';
import { faithMedUrl, parseFaithMedUrl, type FaithMedSection } from './faithMedRouter';
import './faithmed.css';

const NAV_ITEMS: { id: FaithMedSection; label: string }[] = [
  { id: 'home', label: 'Hospital Home' },
  { id: 'departments', label: 'Departments' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'pharmacy', label: 'Faith Pharmacy' },
  { id: 'patient-portal', label: 'Patient Portal' },
];

const SLOTS = [
  'Today · 14:30',
  'Today · 16:00',
  'Tomorrow · 09:30',
  'Tomorrow · 13:00',
  'Next Cycle · 10:00',
];

const TREATMENT_PROTOCOLS = [
  { id: 'Frostlung', title: 'Frostlung Syndrome', desc: 'Warm-essence thermal thaw protocol', btnLabel: 'Apply Thermal Thaw' },
  { id: 'Sunspire Burn Fever', title: 'Sunspire Burn Fever', desc: 'Thermal cooling aura mapping', btnLabel: 'Cool Aura' },
  { id: 'Veilwilt', title: 'Veilwilt Disorder', desc: 'Aura rest & gentle memory seal', btnLabel: 'Seal Veil' },
  { id: 'Riftspine Fracture', title: 'Riftspine Fracture', desc: 'Timeline drift stabilization', btnLabel: 'Re-align Spine' },
];

export default function FaithMedSite({
  url,
  navigateTab,
}: {
  url: string;
  navigateTab: (url: string, title?: string) => void;
}) {
  const parsed = parseFaithMedUrl(url) || { section: 'home' as FaithMedSection, valid: true };
  const section = parsed.section;
  const go = (target: FaithMedSection) => navigateTab(faithMedUrl(target));

  const os = useOSStore();
  const player = os.gameplay.player;
  const cycle = os.gameplay.timeCycleCount ?? 28;
  const corruption = os.gameplay.prismCorruptionLevel ?? 0;
  const auraHealth = player?.auraHealth ?? 100;
  const credits = player?.credits ?? 0;
  const scannedThisCycle = player?.lastFaithDiagnosticCycle === cycle;

  const { appointments, prescriptions, checkIns, bookAppointment, cancelAppointment, orderPharmacyItem } =
    useMedicalStore();

  const [doctorId, setDoctorId] = useState(FAITH_DOCTORS[0].id);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    const res = bookAppointment({ doctorId, slot, reason });
    setNotice(res.message);
    if (res.ok) setReason('');
  };

  const handleOrderRx = (productId: string) => {
    const res = orderPharmacyItem(productId, credits);
    if (res.ok && res.cost > 0) os.addCredits(-res.cost);
    setNotice(res.message);
  };

  const handleBaselineScan = () => {
    const res = os.runFaithDiagnosticScan?.();
    if (res) setNotice(res.message);
  };

  const handleTreat = (condition: string) => {
    const res = os.treatFaithCondition?.(condition);
    if (res) setNotice(res.message);
  };

  return (
    <div className="fmed-site" aria-label="Faith Medical Group website">
      <div className="fmed-alert-bar">
        <span><ShieldCheck size={12} style={{ verticalAlign: 'middle' }} /> FAITH MEDICAL CIVIC NETWORK · MAID COVERAGE ACTIVE (0 ₡ ROUTINE VISITS)</span>
        <span>PRISM EXPOSURE: {corruption}% · CYCLE {cycle}</span>
      </div>

      <header className="fmed-header">
        <div className="fmed-header-top">
          <button className="fmed-brand" onClick={() => go('home')}>
            <span className="fmed-cross" aria-hidden="true"><HeartPulse size={22} /></span>
            <div>
              <h1>Faith Medical Group</h1>
              <span>faithmed.aure · 88 Lantern Boulevard, Aureline</span>
            </div>
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="fmed-btn-secondary" onClick={() => os.openAppWorkspace('vitals')}>
              <Activity size={14} /> Open VITALS App
            </button>
            <button className="fmed-btn-primary" onClick={() => go('appointments')}>
              <Calendar size={14} /> Book Civic Visit
            </button>
          </div>
        </div>
        <nav className="fmed-nav" aria-label="Faith Medical sections">
          {NAV_ITEMS.map(item => (
            <button key={item.id} aria-pressed={section === item.id} onClick={() => go(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="fmed-main">
        {notice && <div className="fmed-notice" role="status">{notice}</div>}

        {section === 'home' && (
          <>
            <section className="fmed-hero">
              <div>
                <span className="fmed-eyebrow" style={{ color: '#99f6e4' }}>AURELINE CIVIC HEALTHCARE & TELEMETRY</span>
                <h2>Care that keeps pace with Meridion.</h2>
                <p>
                  Routine bio-aura diagnostics and physician consultations are covered at no cost for verified MAID citizens.
                  Order compounded remedies from Faith Pharmacy for direct Meridion Post delivery to your residence.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <button
                    className="fmed-btn-primary"
                    style={{ background: '#ffffff', color: '#0b3b3c', borderColor: '#ffffff' }}
                    onClick={() => go('patient-portal')}
                  >
                    Open Patient Portal <ArrowRight size={14} />
                  </button>
                  <button
                    className="fmed-btn-secondary"
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.35)' }}
                    onClick={() => go('pharmacy')}
                  >
                    <Pill size={14} /> Faith Pharmacy
                  </button>
                </div>
              </div>
              <aside className="fmed-hero-card">
                <strong>YOUR HEALTH SNAPSHOT</strong>
                <div>Aura Integrity: <strong>{auraHealth}%</strong></div>
                <div>Active Conditions: <strong>{(player?.conditions || []).length || 'None'}</strong></div>
                <div>Upcoming Visits: <strong>{appointments.filter(a => a.status === 'scheduled').length}</strong></div>
                <div>VITALS Remedies Ready: <strong>{prescriptions.reduce((sum, p) => sum + p.dosesRemaining, 0)} doses</strong></div>
              </aside>
            </section>

            <div className="fmed-grid-3">
              <article className="fmed-card">
                <span className="fmed-eyebrow">Civic Coverage · 0 ₡</span>
                <h3>Book a Clinician Visit</h3>
                <p>Schedule with Dr. Sharon Voss, Dr. Ilyra Saint, or Dr. Kaelen Mercer and receive your confirmation in AureMail.</p>
                <button className="fmed-btn-secondary" onClick={() => go('appointments')}>Schedule visit →</button>
              </article>
              <article className="fmed-card">
                <span className="fmed-eyebrow">Meridion Post Dispatch</span>
                <h3>Faith Compounding Pharmacy</h3>
                <p>Order Aura Stabilizer Tonics, Veilwilt Salves, and Frostlung Inhalers delivered to Suite 4B & synced to VITALS.</p>
                <button className="fmed-btn-secondary" onClick={() => go('pharmacy')}>Browse pharmacy →</button>
              </article>
              <article className="fmed-card">
                <span className="fmed-eyebrow">Personal Telemetry</span>
                <h3>Patient Portal & Scans</h3>
                <p>Run your cycle baseline scan, review condition treatments, and export your Medical Summary in Document Studio.</p>
                <button className="fmed-btn-secondary" onClick={() => go('patient-portal')}>Go to portal →</button>
              </article>
            </div>
          </>
        )}

        {section === 'departments' && (
          <>
            <div>
              <span className="fmed-eyebrow">Clinical Wings · 88 Lantern Boulevard</span>
              <h2 style={{ margin: '6px 0' }}>Hospital Departments</h2>
            </div>
            <div className="fmed-grid-2">
              {FAITH_DEPARTMENTS.map(dept => (
                <article key={dept.id} className="fmed-card">
                  <span className="fmed-eyebrow">{dept.wing} · {dept.hours}</span>
                  <h3>{dept.name}</h3>
                  <p>{dept.summary}</p>
                  <div style={{ fontSize: 12, color: '#0d6e6e', fontWeight: 600 }}>Lead: {dept.lead}</div>
                  <button className="fmed-btn-secondary" onClick={() => go(dept.id === 'dept-pharmacy' ? 'pharmacy' : 'appointments')}>
                    {dept.id === 'dept-pharmacy' ? 'Visit Pharmacy →' : 'Book in this Wing →'}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {section === 'doctors' && (
          <>
            <div>
              <span className="fmed-eyebrow">Medical Staff Directory</span>
              <h2 style={{ margin: '6px 0' }}>Doctors & Specialists</h2>
            </div>
            <div className="fmed-grid-2">
              {FAITH_DOCTORS.map(doc => (
                <article key={doc.id} className="fmed-card">
                  <span className="fmed-eyebrow">{doc.specialty}</span>
                  <h3><Stethoscope size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{doc.name}</h3>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d6e6e' }}>{doc.title}</div>
                  <p>{doc.bio}</p>
                  <div style={{ fontSize: 12, color: '#4d6a6e' }}>
                    <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {doc.location} · Next: <strong>{doc.nextAvailable}</strong>
                  </div>
                  <button
                    className="fmed-btn-primary"
                    onClick={() => {
                      setDoctorId(doc.id);
                      go('appointments');
                    }}
                  >
                    Book with {doc.name}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {section === 'appointments' && (
          <div className="fmed-grid-2">
            <form className="fmed-card fmed-form" onSubmit={handleBook}>
              <span className="fmed-eyebrow">Civic Healthcare · 0 ₡ Covered</span>
              <h3>Book an Appointment</h3>
              <label>
                Select Clinician
                <select value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  {FAITH_DOCTORS.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Preferred Time Slot
                <select value={slot} onChange={e => setSlot(e.target.value)}>
                  {SLOTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Reason for Visit
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Routine bio-aura checkup, PRISM fatigue, Veilwilt screening…"
                />
              </label>
              <button type="submit" className="fmed-btn-primary">Confirm Civic Appointment (0 ₡)</button>
            </form>

            <section className="fmed-card">
              <span className="fmed-eyebrow">Your Schedule</span>
              <h3>Booked Appointments ({appointments.length})</h3>
              {appointments.length ? (
                appointments.map(apt => (
                  <div key={apt.id} style={{ border: '1px solid #d5e6e6', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{apt.doctorName}</strong>
                      <span className="fmed-pill">{apt.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#466064' }}>{apt.slot} · {apt.department}</div>
                    <div style={{ fontSize: 12 }}>{apt.reason}</div>
                    {apt.status === 'scheduled' && (
                      <button className="fmed-btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => cancelAppointment(apt.id)}>
                        Cancel Visit
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>No appointments scheduled yet. Book a free civic visit on the left.</p>
              )}
            </section>
          </div>
        )}

        {section === 'pharmacy' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="fmed-eyebrow">Faith Compounding Pharmacy · Meridion Post Doorstep Delivery</span>
                <h2 style={{ margin: '6px 0' }}>Prescriptions & Aura Remedies</h2>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="fmed-pill">Balance: {credits} ₡</span>
                <button className="fmed-btn-secondary" onClick={() => os.openAppWorkspace('post', 'locker')}>
                  <Package size={13} /> Open Meridion Post
                </button>
              </div>
            </div>
            <div className="fmed-grid-3">
              {FAITH_PHARMACY_CATALOG.map(item => {
                const supply = prescriptions.find(p => p.productId === item.id);
                return (
                  <article key={item.id} className="fmed-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="fmed-eyebrow">{item.category}</span>
                      <span className="fmed-pill">{item.cost} ₡ · {item.doses} doses</span>
                    </div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <p style={{ fontSize: 12, color: '#0d6e6e' }}><strong>Effect:</strong> {item.usageNote}</p>
                    <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: '#466064' }}>In VITALS: <strong>{supply?.dosesRemaining ?? 0}</strong></span>
                      <button className="fmed-btn-primary" onClick={() => handleOrderRx(item.id)}>
                        <Pill size={13} /> Order ({item.cost} ₡)
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {section === 'patient-portal' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="fmed-eyebrow">MAID Authenticated · Patient Record</span>
                <h2 style={{ margin: '6px 0' }}>Your Patient Portal</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="fmed-btn-secondary" onClick={() => os.openAppWorkspace('vitals')}>
                  <Activity size={14} /> Open VITALS <ArrowUpRight size={13} />
                </button>
                <button className="fmed-btn-secondary" onClick={() => os.openAppWorkspace('documentStudio')}>
                  <FileText size={14} /> Medical Summary Packet
                </button>
              </div>
            </div>

            <section className="fmed-card" style={{ background: '#edf8f6', borderColor: '#98d6ce' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <span className="fmed-eyebrow">Cycle {cycle} Telemetry Calibration</span>
                  <h3>Personal Baseline Bio-Aura Scan</h3>
                  <p>Free routine diagnostic scan restoring +20% Aura Integrity and +10 Stamina once per cycle.</p>
                </div>
                <button className="fmed-btn-primary" disabled={scannedThisCycle} onClick={handleBaselineScan}>
                  {scannedThisCycle ? <><CheckCircle2 size={14} /> Scanned This Cycle</> : 'Run Baseline Aura Scan (0 ₡)'}
                </button>
              </div>
            </section>

            <section className="fmed-card">
              <span className="fmed-eyebrow">Outpatient Protocols</span>
              <h3>Condition Treatment Desk</h3>
              <div className="fmed-grid-2">
                {TREATMENT_PROTOCOLS.map(proto => (
                  <div key={proto.id} style={{ border: '1px solid #d5e6e6', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{proto.title}</strong>
                      <div style={{ fontSize: 12, color: '#466064' }}>{proto.desc}</div>
                    </div>
                    <button className="fmed-btn-secondary" onClick={() => handleTreat(proto.id)}>
                      {proto.btnLabel}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="fmed-card">
              <span className="fmed-eyebrow">Synced from VITALS Wearable</span>
              <h3>Recent Wellness Check-Ins ({checkIns.length})</h3>
              {checkIns.slice(0, 4).map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid #e6f0f0', paddingBottom: 8, fontSize: 12.5 }}>
                  <strong>{c.mood}</strong> · Energy {c.energy}% · <span style={{ color: '#4d6a6e' }}>{c.at}</span>
                  <div style={{ color: '#3b5357' }}>{c.note}</div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      <footer className="fmed-footer">
        <span>Faith Medical Group · 88 Lantern Boulevard, Sector 2, Aureline</span>
        <span>faithmed.aure · Civic Healthcare & Bio-Aura Telemetry</span>
      </footer>
    </div>
  );
}
