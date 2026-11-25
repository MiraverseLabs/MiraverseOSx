import { useEffect, useState } from 'react';
import { Network } from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { getRun, listRuns, runCitizens, type LivingWorldRun, type RunCitizen } from '../integration/livingWorldLink';

export default function LivingWorldLinkPanel() {
  const link = useOSStore((s) => s.gameplay.livingWorldLink);
  const linkCitizen = useOSStore((s) => s.linkLivingWorldCitizen);
  const unlinkCitizen = useOSStore((s) => s.unlinkLivingWorldCitizen);
  const [runs, setRuns] = useState<LivingWorldRun[]>([]);
  const [runId, setRunId] = useState(link?.runId ?? '');
  const [citizens, setCitizens] = useState<RunCitizen[]>([]);
  const [characterId, setCharacterId] = useState(link?.characterId ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listRuns().then((items) => { if (active) setRuns(items); }).catch(() => { if (active) setRuns([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!runId) { setCitizens([]); return; }
    let active = true;
    getRun(runId).then((snapshot) => { if (active) setCitizens(runCitizens(snapshot)); })
      .catch(() => { if (active) setCitizens([]); });
    return () => { active = false; };
  }, [runId]);

  const onLink = async () => {
    if (!runId || !characterId) { setMessage('Choose a run and a citizen first.'); return; }
    setBusy(true);
    const result = await linkCitizen(runId, characterId);
    setMessage(result.message);
    setBusy(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-xs font-bold text-[#1d2650] uppercase tracking-wider flex items-center gap-2">
          <Network size={15} className="text-[#5f6ab0]" /> Living World link
        </h3>
        <p className="text-[11px] text-slate-500">
          Bind your player to one simulation citizen. Player credits and time stay authoritative;
          the linked citizen balance mirrors credits and the world clock follows your clock.
        </p>
      </div>

      {link ? (
        <div className="space-y-2 text-[11px] text-slate-600">
          <p><strong>Linked:</strong> {link.displayName} <span className="font-mono">({link.characterId})</span></p>
          <p><strong>Run:</strong> <span className="font-mono">{link.runId}</span></p>
          <button
            className="rounded-lg bg-slate-200 px-3 py-1 font-bold text-slate-700"
            onClick={() => { const result = unlinkCitizen(); setMessage(result.message); }}
          >Unlink</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-[11px] text-slate-600">Run
            <select className="mt-1 w-full rounded-lg border border-slate-300 p-1" value={runId} onChange={(e) => setRunId(e.target.value)}>
              <option value="">Select a run</option>
              {runs.map((run) => <option key={run.RunId} value={run.RunId}>{run.Name || run.RunId}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-600">Citizen
            <select className="mt-1 w-full rounded-lg border border-slate-300 p-1" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">Select a citizen</option>
              {citizens.map((citizen) => <option key={citizen.characterId} value={citizen.characterId}>{citizen.name}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white disabled:opacity-50" disabled={busy || !runId || !characterId} onClick={() => void onLink()}>
            {busy ? 'Linking…' : 'Link citizen'}
          </button>
        </div>
      )}
      {message && <p role="status" className="text-[11px] text-slate-500">{message}</p>}
      {!link && runs.length === 0 && <p className="text-[11px] text-slate-400">No Living World runs are available yet.</p>}
    </div>
  );
}