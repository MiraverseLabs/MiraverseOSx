import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { parseTreasuryTelemetry, type TreasuryStats } from '../../services/treasuryTelemetry';

export default function NetworkTelemetry() {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const requestRef = useRef<AbortController | null>(null);

  const fetchCryptoData = async () => {
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 10000);
    setLoading(true);
    try {
      const response = await fetch('/api/crypto', { signal: request.signal });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`Gateway status ${response.status}`);
      }
      const data = parseTreasuryTelemetry(await response.json());
      if (!data) throw new Error('Gateway returned no valid ledger readings');
      if (requestRef.current !== request || request.signal.aborted) return;
      setStats(data);
      setUnavailable(false);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      if (requestRef.current !== request || (request.signal.aborted && !timedOut)) return;
      setUnavailable(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === request && (!request.signal.aborted || timedOut)) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCryptoData();
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, []);

  const ledgerMetrics = [
    { label: 'Confirmed blocks', value: stats?.blocks?.toLocaleString() ?? '—', detail: 'Ledger height' },
    { label: 'Pending transactions', value: stats?.mempool_transactions?.toLocaleString() ?? '—', detail: 'Awaiting confirmation' },
    { label: 'Suggested priority fee', value: `${stats?.suggested_transaction_fee_per_byte_sat ?? '—'} sat/vB`, detail: 'Network fee rate' },
    { label: 'Lifetime transactions', value: stats?.transactions?.toLocaleString() ?? '—', detail: 'Confirmed on the ledger' },
    { label: 'Mining difficulty', value: stats?.difficulty?.toExponential(4) ?? '—', detail: 'Proof-of-work network' },
    { label: '24-hour hashrate', value: stats?.hashrate_24h ?? '—', detail: 'Aggregate network activity' },
  ];
  return (
    <div className="bank-network">
      <p className="bank-fine-print">External network readings are informational and do not change your account balances.</p>
      {unavailable && <p className="bank-notice" role="status">Network data is unavailable. {stats ? 'The last successful readings below may be out of date.' : 'No verified readings to display.'}</p>}
      <section className="treasury-ledger" aria-label="Treasury network telemetry"><header><div><span className="workspace-kicker">Network / proof of work</span><h2>Ledger activity</h2></div><button onClick={fetchCryptoData} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />{loading ? 'Refreshing' : 'Refresh data'}</button></header><table><thead><tr><th>Measure</th><th>Reading</th><th>Context</th></tr></thead><tbody>{ledgerMetrics.map(metric => <tr key={metric.label}><th scope="row">{metric.label}</th><td>{metric.value}</td><td>{metric.detail}</td></tr>)}</tbody></table></section>
      <footer className="treasury-footer"><span><span className="workspace-status-dot" />{unavailable ? (stats ? 'Last successful readings / stale' : 'Gateway unavailable') : loading ? 'Connecting to gateway' : 'Blockchair gateway'}</span><span>{lastUpdated ? `Updated ${lastUpdated}` : 'No successful update yet'}</span></footer>
    </div>
  );
}
