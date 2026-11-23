import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  FileText,
  Lock,
  MapPin,
  Pause,
  Play,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { FIELD_MISSION, FIELD_TARGETS, restoreFieldSession, fieldReady } from '../../gameplay/FieldOperations';
import { WORKNET_ASSIGNMENTS, nextWorkStage } from '../../gameplay/ActivityEngine';
import { isWorldPaused } from '../../integration/worldStateManager';
import { TUNNEL_ART, fieldObjectives, fieldPhase } from './fieldPresentation';
import './field-operations.css';

type Tab = 'operation' | 'dossier' | 'report';

const STEPS = ['Briefing', 'Investigation', 'Containment', 'Report', 'Debrief'] as const;

export default function FieldOperationsApp() {
  const player = useOSStore(s => s.gameplay.player);
  const loggedIn = useOSStore(s => s.isLoggedIn);
  const focused = useOSStore(
    s => s.activeWindowId === 'fieldOperations' && !s.windows.find(w => w.id === 'fieldOperations')?.isMinimized,
  );
  const order = player.worknetOrders?.[FIELD_MISSION];
  const session = restoreFieldSession(order?.fieldSession);
  const completed = order?.status === 'accepted';
  const stage = order ? nextWorkStage(order, player.taskResults || {}) : undefined;
  const recorded = Boolean(order?.resultIds?.some((id: string) => player.taskResults?.[id]?.stageId === 'contain'));
  const reported = Boolean(order && !stage);
  const phase = fieldPhase(session, recorded, reported, completed);
  const objectives = fieldObjectives(session);
  const collectedCount = session.evidence.length + (session.interviewed ? 1 : 0);

  const [tab, setTab] = useState<Tab>('operation');
  const [message, setMessage] = useState(
    'Review your briefing, then enter the service level. Your findings stay with this assignment.',
  );
  const [failed, setFailed] = useState(false);
  const [witness, setWitness] = useState(false);
  const [paused, setPaused] = useState(false);
  const [worldPaused, setWorldPaused] = useState(isWorldPaused);
  const [stepMode, setStepMode] = useState(false);
  const [renderer, setRenderer] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState('relay');
  const [report, setReport] = useState(order?.drafts?.report?.report || '');
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );

  const parent = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof import('./TunnelScene').createTunnelGame> | null>(null);
  const canPlay = Boolean(loggedIn && order?.status === 'active' && order.briefingReadAt && !order.remediationRequired);
  const running = canPlay && focused && !paused && !worldPaused && !witness;
  const runningRef = useRef(running);
  runningRef.current = running;

  const notebook = objectives.find(target => target.id === selected) ?? objectives[0];
  const activeStep = order?.briefingReadAt ? phase.step : 0;

  const notify = (result: { ok: boolean; message?: string; reason?: string }) => {
    setFailed(!result.ok);
    setMessage(result.message || result.reason || 'Review your assignment.');
  };

  const run = (action: 'move' | 'interact' | 'record', payload?: any) => {
    const result = useOSStore.getState().fieldAction(action, payload);
    if (action !== 'move') notify(result);
    return result;
  };

  const inspect = (id: string) => {
    setSelected(id);
    if (id === 'witness') setWitness(true);
    else run('interact', { id });
  };

  useEffect(() => {
    const draft = order?.drafts?.report?.report;
    if (draft && !report) setReport(draft);
  }, [order?.drafts?.report?.report]);

  useEffect(() => {
    const id = window.setInterval(() => setWorldPaused(isWorldPaused()), 750);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!canPlay || !parent.current || stepMode || tab !== 'operation') return;
    let cancelled = false;
    setRenderer('loading');
    const timeout = window.setTimeout(() => {
      if (!cancelled) setRenderer('error');
    }, 15000);

    import('./TunnelScene')
      .then(({ createTunnelGame }) => {
        if (cancelled || !parent.current) return;
        const latestSession = restoreFieldSession(
          useOSStore.getState().gameplay.player.worknetOrders?.[FIELD_MISSION]?.fieldSession,
        );
        engine.current = createTunnelGame(
          parent.current,
          latestSession,
          (x, y) => {
            if (runningRef.current) useOSStore.getState().fieldAction('move', { x, y });
          },
          id => {
            if (runningRef.current) inspect(id);
          },
          () => {
            if (!cancelled) {
              clearTimeout(timeout);
              setRenderer('ready');
            }
          },
          () => {
            if (!cancelled) {
              clearTimeout(timeout);
              setRenderer('error');
            }
          },
          window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          selected,
        );
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setRenderer('error');
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      engine.current?.destroy();
      engine.current = null;
    };
  }, [canPlay, stepMode, tab]);

  useEffect(() => {
    const syncPause = () => {
      if (!engine.current || renderer !== 'ready') return;
      engine.current.setPaused(!running || document.hidden);
    };
    syncPause();
    document.addEventListener('visibilitychange', syncPause);
    return () => document.removeEventListener('visibilitychange', syncPause);
  }, [running, renderer, tab, stepMode]);

  useEffect(() => {
    engine.current?.sync(session, selected, reducedMotion);
  }, [session.x, session.y, session.evidence.join(','), session.interviewed, session.sealed, selected, reducedMotion, renderer]);

  const travel = (id: string) => {
    if (!running) return;
    const target = FIELD_TARGETS.find(item => item.id === id);
    if (!target) return;
    setSelected(id);
    if (stepMode || renderer === 'error') {
      const result = run('move', target);
      if (result.ok) inspect(id);
      else notify(result);
    } else {
      engine.current?.travel(id);
      setFailed(false);
      setMessage(`Approaching ${target.label.toLowerCase()}…`);
    }
  };

  const openWorknet = () => useOSStore.getState().openAppWorkspace('jobs');

  const transmit = () => {
    const result = run('record');
    if (result.ok) setTab('report');
  };

  const assignment = WORKNET_ASSIGNMENTS[FIELD_MISSION];

  return (
    <main className="field-app">
      <header className="field-header">
        <div className="field-header-copy">
          <span className="field-eyebrow">
            DGA / RESPONSE DIVISION <span>— OPERATION 512</span>
          </span>
          <h1>The signal beneath Aureline.</h1>
          <p>A sealed platform. An unsigned signal. Follow it to its source.</p>
        </div>
        <button type="button" className="field-link" onClick={openWorknet}>
          WORKNET <ArrowUpRight size={15} />
        </button>
      </header>

      <div className="field-mission-strip">
        <span>
          <MapPin size={13} /> Sub-Aureline · Tunnel 09
        </span>
        <span data-status={completed ? 'closed' : session.sealed ? 'sealed' : 'active'}>
          <Radio size={13} /> {completed ? 'Closed / accepted' : session.sealed ? 'Containment established' : 'Public platform sealed'}
        </span>
        <span>
          Clearance 2 <i aria-hidden="true" /> {assignment.rewardCredits.toLocaleString()} ₢ + {assignment.rewardXP} XP
        </span>
      </div>

      <div className="field-progress" aria-label="Operation progress">
        {STEPS.map((name, index) => {
          const state = index < activeStep ? 'done' : index === activeStep ? 'current' : 'pending';
          return (
            <div key={name} className="field-progress-step" data-state={state}>
              <span className="field-progress-badge">
                {state === 'done' ? <Check size={12} /> : String(index + 1).padStart(2, '0')}
              </span>
              <span className="field-progress-name">{name}</span>
            </div>
          );
        })}
      </div>

      <div className="field-nav-bar">
        <nav className="field-tabs" aria-label="Field workspace">
          <button
            type="button"
            aria-current={tab === 'operation' ? 'page' : undefined}
            onClick={() => setTab('operation')}
          >
            Operation
          </button>
          <button
            type="button"
            aria-current={tab === 'dossier' ? 'page' : undefined}
            onClick={() => setTab('dossier')}
          >
            Evidence dossier <span className="field-tab-count">{collectedCount}/4</span>
          </button>
          <button
            type="button"
            aria-current={tab === 'report' ? 'page' : undefined}
            onClick={() => setTab('report')}
          >
            Report & debrief
          </button>
        </nav>
        <span className="field-autosave">Progress saved with your assignment</span>
      </div>

      {worldPaused && (
        <p className="field-notice" role="status">
          The world is paused. Resume it to continue this operation.
        </p>
      )}

      {tab === 'operation' && (
        <div className="field-layout">
          <section className="field-stage" aria-label="Tunnel investigation">
            <div className="field-scene" data-renderer={canPlay && !stepMode ? renderer : 'preview'}>
              <img
                src={TUNNEL_ART}
                alt="Overhead view of Tunnel 09, with utility relays, a service terminal, conduit damage, and the sealed platform."
              />
              {canPlay && !stepMode && (
                <div
                  ref={parent}
                  className="field-canvas"
                  tabIndex={0}
                  role="group"
                  aria-label="Tunnel 09 exploration. Use WASD or arrow keys to move, or click any location."
                  onPointerDown={event => event.currentTarget.focus()}
                  onKeyDown={event => {
                    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
                    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                      event.preventDefault();
                      if (running) engine.current?.key(key, true);
                    }
                  }}
                  onKeyUp={event =>
                    engine.current?.key(event.key.length === 1 ? event.key.toLowerCase() : event.key, false)
                  }
                  onBlur={() => engine.current?.stop()}
                />
              )}

              {!canPlay && (
                <div className="field-scene-caption">
                  <span className="field-eyebrow">{completed ? 'CASE CLOSED' : 'SERVICE LEVEL / 09'}</span>
                  <h2>{completed ? 'The platform is secure.' : 'Below the city, a signal breaks.'}</h2>
                  <p>
                    {completed
                      ? 'Your fieldwork is preserved in the evidence dossier.'
                      : 'Three traces. One witness. Keep the bleed away from the public platform.'}
                  </p>
                </div>
              )}

              {canPlay && (
                <div className="field-scene-label">
                  <span data-sealed={session.sealed}>
                    <Compass size={12} />{' '}
                    {session.sealed ? 'Containment active' : stepMode ? 'Guided investigation' : 'Live field view'}
                  </span>
                  <span>
                    TUNNEL 09 · {Math.round(session.x)}, {Math.round(session.y)}
                  </span>
                </div>
              )}

              {canPlay && !stepMode && (paused || !focused || worldPaused) && (
                <div className="field-scene-cover">
                  <Pause size={22} />
                  <span>{worldPaused ? 'World paused' : paused ? 'Scene paused' : 'Field view on standby'}</span>
                  {paused && (
                    <button type="button" onClick={() => setPaused(false)}>
                      Resume scene
                    </button>
                  )}
                </div>
              )}
            </div>

            {canPlay && (
              <div className="field-scene-toolbar">
                <p>
                  {stepMode
                    ? 'Choose a location from the investigation list.'
                    : renderer === 'error'
                      ? 'Scene unavailable. Choose a location to continue in guided mode.'
                      : renderer === 'loading'
                        ? 'Preparing the tunnel scene…'
                        : 'Click to walk · WASD / arrows · select a numbered location to inspect'}
                </p>
                <div className="field-toolbar-actions">
                  <button type="button" className="field-link" onClick={() => setStepMode(value => !value)}>
                    {stepMode ? 'Explore scene' : 'Guided mode'}
                  </button>
                  <button type="button" className="field-link" onClick={() => setPaused(value => !value)}>
                    {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? 'Resume scene' : 'Pause scene'}
                  </button>
                </div>
              </div>
            )}

            {!canPlay && (
              <section className="field-brief" aria-label="Operation briefing">
                <span className="field-eyebrow">{completed ? 'DEBRIEF / ACCEPTED' : 'YOUR ASSIGNMENT'}</span>
                <h2>
                  {completed
                    ? 'A clean handoff. A quieter city.'
                    : order?.remediationRequired
                      ? 'Equipment review required.'
                      : 'Enter with a plan.'}
                </h2>
                <p>
                  {completed
                    ? 'Your findings, containment report, and one-time reward receipt are saved in WORKNET. You can review your evidence and report here.'
                    : order?.remediationRequired
                      ? 'An equipment incident needs remediation in WORKNET before the investigation can continue.'
                      : 'An unsigned thread is leaking memory into the transit carrier. Inspect three sources, interview technician Iona, and deploy Hazmat-01 and Patrol-12 under SealLockCrypt. Keep the public platform sealed.'}
                </p>
                <div className="field-brief-bottom">
                  <span>Finalization requires clearance 2 and 10 stamina.</span>
                  {!loggedIn ? (
                    <span>Log in to accept this assignment.</span>
                  ) : completed ? (
                    <button type="button" className="field-primary" onClick={() => setTab('report')}>
                      View debrief <ArrowRight size={15} />
                    </button>
                  ) : order?.remediationRequired ? (
                    <button type="button" className="field-primary" onClick={openWorknet}>
                      Resolve in WORKNET <ArrowUpRight size={15} />
                    </button>
                  ) : !order ? (
                    <button
                      type="button"
                      className="field-primary"
                      disabled={worldPaused}
                      onClick={() => notify(useOSStore.getState().openWorknetOrder(FIELD_MISSION))}
                    >
                      Accept Tunnel 09 assignment <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="field-primary"
                      disabled={worldPaused}
                      onClick={() => notify(useOSStore.getState().acknowledgeAssignmentBriefing(FIELD_MISSION))}
                    >
                      Acknowledge briefing & enter <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </section>
            )}

            {canPlay && (
              <section
                className="field-inspection"
                aria-label="Selected location"
                data-state={notebook.done ? 'done' : notebook.locked ? 'locked' : 'pending'}
              >
                <div className="field-inspection-head">
                  <span className="field-eyebrow">
                    LOCATION {notebook.number} /{' '}
                    {notebook.done ? 'RECORDED' : notebook.locked ? 'AWAITING EVIDENCE' : 'AWAITING INSPECTION'}
                  </span>
                  {!notebook.done && !notebook.locked && (
                    <button
                      type="button"
                      className="field-link"
                      disabled={!running || (!stepMode && renderer === 'loading')}
                      onClick={() => travel(notebook.id)}
                    >
                      {notebook.id === 'witness'
                        ? 'Approach & interview'
                        : notebook.id === 'seal'
                          ? 'Approach & deploy'
                          : 'Approach & inspect'}{' '}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <h2>{notebook.label}</h2>
                <p>
                  {notebook.done
                    ? notebook.detail
                    : notebook.locked
                      ? 'Collect all three findings and interview Iona before deploying containment.'
                      : 'Approach this location to examine it and add verified findings to your dossier.'}
                </p>
              </section>
            )}

            {witness && (
              <section className="field-interview" aria-label="Interview technician Iona">
                <span className="field-eyebrow">WITNESS / TRANSIT TECHNICIAN</span>
                <h2>Iona</h2>
                <blockquote>“The platform is sealed. What do you need to know?”</blockquote>
                <div className="field-interview-actions">
                  <button
                    type="button"
                    disabled={worldPaused}
                    onClick={() => {
                      run('interact', { id: 'witness' });
                      setWitness(false);
                    }}
                  >
                    <span>What happened before the signal failed?</span>
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFailed(false);
                      setMessage(
                        'Iona: “I am safe behind the platform seal. Check the service terminal and relay for the source.”',
                      );
                      setWitness(false);
                    }}
                  >
                    <span>Are you safe here?</span>
                    <ChevronRight size={15} />
                  </button>
                  <button type="button" className="field-link" onClick={() => setWitness(false)}>
                    Return to investigation
                  </button>
                </div>
              </section>
            )}
          </section>

          <aside className="field-notebook">
            <span className="field-eyebrow">{completed ? 'OPERATION ARCHIVE' : 'CURRENT OBJECTIVE'}</span>
            <h2>{order?.briefingReadAt ? phase.label : 'Review the briefing'}</h2>
            <p className="field-notebook-lead">
              {order?.briefingReadAt
                ? phase.instruction
                : 'Understand the site and accept the assignment before entering Tunnel 09.'}
            </p>

            <div className="field-objectives" aria-label="Investigation locations">
              {objectives.map(target => (
                <button
                  key={target.id}
                  type="button"
                  className="field-objective-btn"
                  data-done={target.done}
                  data-locked={target.locked}
                  aria-label={`${target.done ? 'Review' : 'Inspect'} ${target.label}`}
                  aria-pressed={selected === target.id}
                  disabled={!canPlay || !running || target.locked || (!stepMode && renderer === 'loading')}
                  onClick={() => travel(target.id)}
                >
                  <span className="field-objective-number">
                    {target.done ? <Check size={14} /> : target.locked ? <Lock size={13} /> : target.number}
                  </span>
                  <span className="field-objective-meta">
                    <strong>{target.label}</strong>
                    <small>
                      {target.done
                        ? 'Recorded'
                        : target.locked
                          ? 'Collect evidence first'
                          : target.id === 'witness'
                            ? 'Interview witness'
                            : target.id === 'seal'
                              ? 'Deploy response teams'
                              : 'Inspect location'}
                    </small>
                  </span>
                  <ChevronRight size={14} className="field-objective-chevron" />
                </button>
              ))}
            </div>

            <div className="field-evidence-count">
              <strong>
                {collectedCount}
                <span> / 4</span>
              </strong>
              <span>Source records collected</span>
            </div>

            <button
              type="button"
              className="field-primary field-transmit-btn"
              disabled={!canPlay || !fieldReady(session) || !session.sealed || worldPaused || recorded}
              onClick={transmit}
            >
              {recorded ? <Check size={15} /> : <FileText size={15} />}{' '}
              {recorded ? 'Findings transmitted' : 'Transmit field findings'}
            </button>
            <p className="field-fine-print">
              {recorded ? 'Continue in Report & debrief.' : 'Containment must be established before transmission.'}
            </p>

            <div className="field-safety">
              <ShieldCheck size={18} />
              <div>
                <strong>Public platform protected</strong>
                <p>The public barrier stays sealed throughout the investigation.</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === 'dossier' && (
        <section className="field-dossier">
          <header className="field-dossier-header">
            <div>
              <span className="field-eyebrow">FIELD RECORD / OPERATION 512</span>
              <h2>What the tunnel tells us.</h2>
            </div>
            <span className="field-dossier-count">{collectedCount} of 4 source records</span>
          </header>

          <div className="field-evidence-grid">
            {objectives
              .filter(target => target.id !== 'seal')
              .map(target => (
                <article key={target.id} data-collected={target.done}>
                  <span className="field-eyebrow">
                    {target.id === 'witness' ? 'WITNESS ACCOUNT' : `EXHIBIT ${target.number}`} /{' '}
                    {target.done ? 'RECORDED' : 'PENDING'}
                  </span>
                  <h3>{target.label}</h3>
                  <p>
                    {target.done
                      ? target.detail
                      : 'No verified record yet. Return to the tunnel to inspect this source.'}
                  </p>
                  {!target.done && (
                    <button
                      type="button"
                      className="field-link"
                      onClick={() => {
                        setSelected(target.id);
                        setTab('operation');
                      }}
                    >
                      Locate in operation <ArrowUpRight size={14} />
                    </button>
                  )}
                </article>
              ))}
          </div>

          <div className="field-containment-record" data-sealed={session.sealed}>
            <ShieldCheck size={22} />
            <div>
              <h3>Containment record</h3>
              <p>
                {session.sealed
                  ? 'Hazmat-01 and Patrol-12 deployed under SealLockCrypt. Public platform isolation preserved.'
                  : 'Awaiting three source findings and Iona’s account. Containment remains pending.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === 'report' && (
        <section className="field-report-layout">
          <div className="field-report-summary">
            <span className="field-eyebrow">FINAL HANDOFF / OPERATION 512</span>
            <h2>{completed ? 'An operation on record.' : 'Make the findings count.'}</h2>
            <p>
              {completed
                ? 'Your accepted operation is preserved below. This assignment pays once.'
                : 'Transmit your field findings, connect the evidence in a containment report, then finalize the assignment through WORKNET.'}
            </p>

            <ol className="field-report-checklist">
              <li data-done={recorded || completed}>Field findings transmitted</li>
              <li data-done={reported || completed}>Containment report verified</li>
              <li data-done={completed}>Operation accepted & reward issued</li>
            </ol>

            <div className="field-compensation">
              <span className="field-eyebrow">ASSIGNMENT COMPENSATION</span>
              <strong>
                {assignment.rewardCredits.toLocaleString()} ₢ <small>+ {assignment.rewardXP} XP</small>
              </strong>
              <p>
                {completed
                  ? 'Issued through your WORKNET completion receipt.'
                  : 'Awarded after validation and finalization.'}
              </p>
            </div>

            {recorded && !completed && (
              <div className="field-reference-notes">
                <span className="field-eyebrow">COLLECTED FIELD NOTES</span>
                <ul>
                  {objectives.map(item => (
                    <li key={item.id}>
                      <strong>{item.label}:</strong> {item.done ? item.detail : 'Pending'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="field-report-surface">
            {completed ? (
              <>
                <span className="field-eyebrow">ACCEPTED / SAVED</span>
                <h3>Containment report</h3>
                <p className="field-report-copy">
                  {report || 'Review the verified report and completion receipt in WORKNET.'}
                </p>
                <button type="button" className="field-primary" onClick={openWorknet}>
                  View WORKNET receipt <ArrowUpRight size={15} />
                </button>
              </>
            ) : !recorded ? (
              <>
                <span className="field-eyebrow">STEP REQUIRED</span>
                <h3>Your fieldwork comes first.</h3>
                <p>
                  Collect the sources, speak with Iona, establish containment, and transmit the findings before writing
                  your report.
                </p>
                <div className="field-report-actions">
                  <button
                    type="button"
                    className="field-primary"
                    disabled={!canPlay || !session.sealed || worldPaused}
                    onClick={transmit}
                  >
                    Transmit field findings <ArrowRight size={15} />
                  </button>
                  <button type="button" className="field-link" onClick={() => setTab('operation')}>
                    Return to operation
                  </button>
                </div>
              </>
            ) : !reported ? (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  notify(useOSStore.getState().submitWorknetStage(FIELD_MISSION, 'report', { report }));
                }}
              >
                <label htmlFor="field-containment-report">Containment report</label>
                <p>
                  Identify the source PID, carrier frequency, tunnel, response teams, and the containment seal. Use your
                  field notes to support the report.
                </p>
                <textarea
                  id="field-containment-report"
                  value={report}
                  maxLength={4000}
                  onChange={event => {
                    setReport(event.target.value);
                    useOSStore.getState().saveWorknetDraft(FIELD_MISSION, 'report', { report: event.target.value });
                  }}
                  placeholder="Describe what you found and how the bleed was contained…"
                />
                <small>{report.length.toLocaleString()} / 4,000 characters · draft saved with this assignment</small>
                <button
                  type="submit"
                  className="field-primary"
                  disabled={!canPlay || worldPaused || !report.trim()}
                >
                  Submit containment report <ArrowRight size={15} />
                </button>
              </form>
            ) : (
              <>
                <span className="field-eyebrow">REPORT VERIFIED</span>
                <h3>Ready for the final handoff.</h3>
                <p>
                  Your evidence and report have passed WORKNET validation. Finalization requires clearance 2 and 10
                  stamina.
                </p>
                <button
                  type="button"
                  className="field-primary"
                  disabled={!canPlay || worldPaused}
                  onClick={() => {
                    const result = useOSStore.getState().completeWorknetMission(assignment);
                    notify({
                      ...result,
                      message: result.ok ? 'Operation accepted. Your WORKNET reward receipt is saved.' : result.reason,
                    });
                  }}
                >
                  Finalize operation & claim reward <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <footer className="field-feedback" role={failed ? 'alert' : 'status'} data-error={failed}>
        <span className="field-eyebrow">FIELD LOG</span>
        <p>{message}</p>
        <span className="field-feedback-brand">MiraverseOSx / DGA</span>
      </footer>
    </main>
  );
}
