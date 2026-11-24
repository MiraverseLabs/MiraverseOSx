import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Check, Landmark } from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { BANK_PAYEES, parseBankAmount, restoreBanking, type BankCommand, type BankEntry, type BankKind } from '../../gameplay/Banking';
import NetworkTelemetry from './NetworkTelemetry';
import '../../styles/apps/banking.css';

const format = (value: number) => value.toLocaleString();
const names = { deposit: 'Move to savings', withdraw: 'Withdraw from savings', transfer: 'Send to a resident', gameplay: 'Gameplay activity' };
export default function BankingWorkspace() {
  const player = useOSStore(state => state.gameplay.player);
  const identity = useOSStore(state => state.gameplay.identity);
  const loggedIn = useOSStore(state => state.isLoggedIn);
  const bankAction = useOSStore(state => state.bankAction);
  const bank = restoreBanking(player.banking);
  const [tab, setTab] = useState<'overview' | 'move' | 'activity' | 'network'>('overview');
  const [kind, setKind] = useState<BankKind>('deposit');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, setPending] = useState<BankCommand | null>(null);
  const [receipt, setReceipt] = useState<BankEntry | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<BankEntry | null>(null);
  const entries = bank.entries.slice().reverse().filter(entry => (filter === 'all' || entry.kind === filter) && `${entry.memo} ${entry.id} ${BANK_PAYEES.find(payee => payee.id === entry.recipient)?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const startMove = (next: BankKind) => { setKind(next); setTab('move'); setPending(null); setReceipt(null); setError(''); };
  const review = (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setReceipt(null);
    const value = parseBankAmount(amount);
    if (value === null) { setError('Enter a positive whole-credit amount.'); return; }
    if (value > (kind === 'withdraw' ? bank.savings : player.credits)) { setError(kind === 'withdraw' ? 'Insufficient savings balance.' : 'Insufficient available credits.'); return; }
    if (kind === 'transfer' && !BANK_PAYEES.some(payee => payee.id === recipient)) { setError('Choose a registered recipient.'); return; }
    setPending({ kind, amount: value, recipient: kind === 'transfer' ? recipient : undefined, memo: memo.trim(), requestId: `BNK-${crypto.randomUUID()}` });
  };
  const confirm = () => {
    if (!pending) return;
    const result = bankAction(pending);
    if (!result.ok) { setError(result.message); return; }
    setReceipt(result.entry ?? null); setPending(null); setAmount(''); setMemo(''); setError('');
  };
  const activity = (list: BankEntry[]) => list.length ? <div className="bank-entries">{list.map(entry => <button className="bank-entry" key={entry.id} onClick={() => setSelected(entry)}><span className="bank-entry-symbol" aria-hidden="true">{entry.credits > 0 || entry.bits > 0 ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span><span className="bank-entry-description"><strong>{entry.memo}</strong><small>{new Date(entry.at).toLocaleString()} · {names[entry.kind]}</small></span><span className="bank-entry-amount"><strong>{entry.credits > 0 ? '+' : ''}{format(entry.credits)} ₢</strong>{entry.savings !== 0 && <small>Savings {entry.savings > 0 ? '+' : ''}{format(entry.savings)} ₢</small>}{entry.bits !== 0 && <small>{entry.bits > 0 ? '+' : ''}{format(entry.bits)} bits</small>}</span><ArrowRight size={15} aria-hidden="true"/></button>)}</div> : <div className="bank-empty"><h3>{bank.entries.length ? 'No matching transactions.' : 'Your next chapter starts here.'}</h3><p>{bank.entries.length ? 'Try another search or transaction type.' : 'New savings moves, resident transfers, and gameplay income or payments will appear here. Earlier activity is not reconstructed.'}</p></div>;
  return <main className="bank-workspace">
    <header className="bank-heading"><div><span className="bank-eyebrow">ORYN Vault / personal treasury</span><h1>Your money, in view.</h1><p>{player.name || 'Citizen'} <span>· {identity.citizenId || 'Provisional citizen account'}</span></p></div><Landmark size={30} strokeWidth={1.1} aria-hidden="true"/></header>
    <nav className="bank-nav" aria-label="Banking sections">{(['overview','move','activity','network'] as const).map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => { setTab(item); setSelected(null); }}>{({overview:'Overview',move:'Move money',activity:'Activity',network:'Network data'})[item]}</button>)}</nav>
    {!loggedIn && <p className="bank-notice" role="status">Log in to move credits between accounts or send a resident transfer.</p>}
    {tab === 'overview' && <>
      <section className="bank-balances" aria-label="Account balances"><div className="bank-primary-balance"><span className="bank-eyebrow">Available to spend</span><strong>{format(player.credits)} <small>₢</small></strong><p>Oryn credits · everyday account</p><button onClick={() => startMove('transfer')}>Send credits <ArrowUpRight size={16}/></button></div><div><span className="bank-eyebrow">Set aside</span><strong>{format(bank.savings)} <small>₢</small></strong><p>Savings · available when you need it</p><button onClick={() => startMove('deposit')}>Add to savings <ArrowRight size={16}/></button></div><div className="bank-bits"><span className="bank-eyebrow">Aether reserve</span><strong>{format(player.bits ?? 0)} <small>bits</small></strong><p>Separate gameplay currency</p><span className="bank-fine-print">No credit conversion</span></div></section>
      <section className="bank-section"><header><div><span className="bank-eyebrow">The latest</span><h2>Recent activity</h2></div><button className="bank-text-button" onClick={() => setTab('activity')}>View all activity <ArrowRight size={15}/></button></header>{activity(bank.entries.slice(-4).reverse())}</section>
      <aside className="bank-account-note"><span>One account. Across your desktop.</span><p>Your balances, payroll deposits, and transaction history stay in sync across ORYN Vault. Savings stays separate from spending money. Send credits instantly to registered residents.</p></aside>
    </>}
    {tab === 'move' && <section className="bank-move-layout"><div className="bank-move-intro"><span className="bank-eyebrow">Make room for what’s next</span><h2>A little aside.<br/>{' '}A little onward.</h2><p>Move credits into savings, bring them back, or send them to a registered resident.</p><dl><div><dt>Available</dt><dd>{format(player.credits)} ₢</dd></div><div><dt>Savings</dt><dd>{format(bank.savings)} ₢</dd></div></dl><p className="bank-fine-print">Instant settlement · no fees · no interest</p></div><div className="bank-form-surface">
      {receipt && <div className="bank-receipt" role="status"><Check size={20}/><div><h3>Transaction settled</h3><p>{receipt.memo}</p><strong>{format(Math.abs(receipt.credits))} ₢</strong><small>Reference {receipt.id}</small><button className="bank-text-button" onClick={() => {setSelected(receipt);setTab('activity');}}>View receipt <ArrowRight size={14}/></button></div></div>}
      {pending ? <section aria-label="Review transaction" className="bank-review"><span className="bank-eyebrow">Review before sending</span><h3>{names[pending.kind]}</h3><strong>{format(pending.amount)} ₢</strong><p>From {pending.kind === 'withdraw' ? 'savings' : 'available balance'} to {pending.kind === 'transfer' ? BANK_PAYEES.find(payee => payee.id === pending.recipient)?.name : pending.kind === 'deposit' ? 'savings' : 'available balance'}.</p>{pending.memo && <p>Memo: {pending.memo}</p>}<p>Fee: 0 ₢ · Total: {format(pending.amount)} ₢</p><div className="bank-form-actions"><button className="bank-submit" onClick={confirm} disabled={!loggedIn}>Confirm transaction</button><button className="bank-text-button" onClick={() => {setPending(null);setError('');}}>Back to edit</button></div></section> : <form onSubmit={review}><label>Transaction type<select aria-label="Transaction type" value={kind} onChange={event => {setKind(event.target.value as BankKind);setError('');setReceipt(null);}}><option value="deposit">Move to savings</option><option value="withdraw">Withdraw from savings</option><option value="transfer">Send to a resident</option></select></label>{kind === 'transfer' && <label>Recipient<select aria-label="Recipient" value={recipient} onChange={event => setRecipient(event.target.value)} required><option value="">Choose a registered resident</option>{BANK_PAYEES.map(payee => <option key={payee.id} value={payee.id}>{payee.name} · {payee.detail}</option>)}</select></label>}<label>Amount in credits<input inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0" required autoComplete="off"/><small>Whole credits only. Your savings does not cover purchases automatically.</small></label><label>Memo <span className="bank-optional">optional</span><input value={memo} maxLength={160} onChange={event => setMemo(event.target.value)} placeholder="What’s this for?"/></label><button className="bank-submit" type="submit" disabled={!loggedIn}>Review transaction <ArrowRight size={16}/></button></form>}
      {error && <p className="bank-error" role="alert">{error}</p>}
    </div></section>}
    {tab === 'activity' && <section className="bank-section"><header><div><span className="bank-eyebrow">Your account record</span><h2>Transaction history</h2></div><span className="bank-fine-print">{bank.entries.length} settled</span></header><div className="bank-filters"><label>Search transactions<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Memo, recipient, or reference"/></label><label>Transaction filter<select aria-label="Transaction filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All transactions</option><option value="deposit">Savings deposits</option><option value="withdraw">Savings withdrawals</option><option value="transfer">Resident transfers</option><option value="gameplay">Gameplay income & payments</option></select></label></div>{selected && <section className="bank-detail" aria-label="Transaction receipt"><header><h3>Settled receipt</h3><button className="bank-text-button" onClick={() => setSelected(null)}>Close receipt</button></header><p>{selected.memo}</p><p>{names[selected.kind]}{selected.recipient ? ` · ${BANK_PAYEES.find(payee => payee.id === selected.recipient)?.name}` : ''}</p><p>Available change: {selected.credits > 0 ? "+" : ""}{format(selected.credits)} ₢ · Savings change: {selected.savings > 0 ? "+" : ""}{format(selected.savings)} ₢{selected.bits !== 0 ? ` · Bits change: ${selected.bits}` : ""}</p><p>Available balance after: {format(selected.balanceAfter.credits)} ₢ · Savings after: {format(selected.balanceAfter.savings)} ₢</p><small>{new Date(selected.at).toLocaleString()} · {selected.id}</small></section>}{activity(entries)}</section>}
    {tab === 'network' && <NetworkTelemetry/>}
    <footer className="bank-footer"><span>MiraverseOSx / Oryn civic banking</span><span>Balances and receipts saved with your progress</span></footer>
  </main>;
}
