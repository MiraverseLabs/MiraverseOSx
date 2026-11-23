import { HOME_GUESTS } from './Housing';

// These accounts belong to this saved game. They do not represent real payments.
export const BANK_PAYEES = HOME_GUESTS.map(guest => ({ id: `resident:${guest.id}`, name: guest.name, detail: guest.role }));
export type BankKind = 'deposit' | 'withdraw' | 'transfer';
export interface BankCommand { kind: BankKind; amount: number; recipient?: string; memo: string; requestId: string }
export interface BankEntry {
  id: string; at: string; kind: BankKind | 'gameplay'; memo: string; recipient?: string;
  credits: number; savings: number; bits: number;
  balanceAfter: { credits: number; savings: number; bits: number };
  command?: BankCommand;
}
export interface BankingState { version: 1; savings: number; entries: BankEntry[]; recipientBalances: Record<string, number> }
export type BankResult = { ok: boolean; message: string; entry?: BankEntry };
const money = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function parseBankAmount(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value.trim());
  return money(amount) && amount > 0 ? amount : null;
}
export function restoreBanking(value: unknown): BankingState {
  const source = value as Partial<BankingState> | null;
  return {
    version: 1,
    savings: money(source?.savings) ? source.savings : 0,
    entries: Array.isArray(source?.entries) ? source.entries.filter(entry => entry && typeof entry.id === 'string' && typeof entry.at === 'string' && typeof entry.memo === 'string' && ['deposit','withdraw','transfer','gameplay'].includes(entry.kind) && [entry.credits,entry.savings,entry.bits].every(Number.isSafeInteger) && entry.balanceAfter && [entry.balanceAfter.credits,entry.balanceAfter.savings,entry.balanceAfter.bits].every(money)) : [],
    recipientBalances: Object.fromEntries(BANK_PAYEES.map(payee => [payee.id, money(source?.recipientBalances?.[payee.id]) ? source!.recipientBalances![payee.id] : 0])),
  };
}

export function executeBankCommand(player: any, command: BankCommand): BankResult & { player?: any } {
  if (!command || !['deposit','withdraw','transfer'].includes(command.kind) || !money(command.amount) || command.amount === 0 || typeof command.requestId !== 'string' || !command.requestId.trim() || command.requestId.length > 100 || typeof command.memo !== 'string' || command.memo.length > 160) return { ok: false, message: 'Enter a positive whole-credit amount and a memo of at most 160 characters.' };
  const bank = restoreBanking(player.banking);
  const normalized = { ...command, memo: command.memo.trim(), recipient: command.kind === 'transfer' ? command.recipient : undefined };
  const previous = bank.entries.find(entry => entry.id === command.requestId);
  if (previous) {
    const same = previous.command && ['kind','amount','recipient','memo','requestId'].every(key => previous.command![key as keyof BankCommand] === normalized[key as keyof BankCommand]);
    return same ? { ok: true, message: 'This transaction is already settled.', entry: previous } : { ok: false, message: 'This confirmation has already been used. Start a new transfer.' };
  }
  if (!money(player.credits) || !money(player.bits ?? 0)) return { ok: false, message: 'Account balances need a valid saved-game record.' };
  const payee = command.kind === 'transfer' ? BANK_PAYEES.find(payee => payee.id === command.recipient) : undefined;
  if (command.kind === 'transfer' && !payee) return { ok: false, message: 'Choose a registered recipient.' };
  const fromSavings = command.kind === 'withdraw';
  if (command.amount > (fromSavings ? bank.savings : player.credits)) return { ok: false, message: fromSavings ? 'Insufficient savings balance.' : 'Insufficient available credits.' };
  const creditsDelta = fromSavings ? command.amount : -command.amount;
  const savingsDelta = command.kind === 'deposit' ? command.amount : fromSavings ? -command.amount : 0;
  const credits = player.credits + creditsDelta;
  const savings = bank.savings + savingsDelta;
  const recipientBalance = payee ? bank.recipientBalances[payee.id] + command.amount : 0;
  if (![credits,savings,recipientBalance].every(money)) return { ok: false, message: 'This amount exceeds the account limit.' };
  const entry: BankEntry = { id: command.requestId, at: new Date().toISOString(), kind: command.kind, memo: normalized.memo || (command.kind === 'deposit' ? 'Moved to savings' : fromSavings ? 'Returned to available balance' : `Transfer to ${payee!.name}`), recipient: payee?.id, credits: creditsDelta, savings: savingsDelta, bits: 0, balanceAfter: { credits, savings, bits: player.bits ?? 0 }, command: normalized };
  return { ok: true, message: 'Transaction settled.', entry, player: { ...player, credits, banking: { ...bank, savings, entries: [...bank.entries, entry], recipientBalances: payee ? { ...bank.recipientBalances, [payee.id]: recipientBalance } : bank.recipientBalances } } };
}

// Journal balance changes in the same store update as gameplay payouts/purchases.
// Old saves keep their existing balances; no historical transactions are invented.
export function journalBalanceChange(before: any, after: any): any {
  if (!before || !after || before === after) return after;
  const credits = after.credits - before.credits;
  const bits = (after.bits ?? 0) - (before.bits ?? 0);
  if ((!credits && !bits) || ![credits,bits].every(Number.isSafeInteger)) return after;
  // Explicit bank commands already include their balanced receipt.
  if (after.banking !== before.banking) return after;
  const bank = restoreBanking(before.banking);
  const entry: BankEntry = { id: `ACT-${crypto.randomUUID()}`, at: new Date().toISOString(), kind: 'gameplay', memo: credits > 0 || bits > 0 ? 'Gameplay income' : 'Gameplay payment', credits, savings: 0, bits, balanceAfter: { credits: after.credits, savings: bank.savings, bits: after.bits ?? 0 } };
  return { ...after, banking: { ...bank, entries: [...bank.entries, entry] } };
}
