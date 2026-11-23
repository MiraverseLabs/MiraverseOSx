import { executeBankCommand, type BankCommand, type BankResult } from '../gameplay/Banking';
import { isWorldPaused } from '../integration/worldStateManager';
import type { OSStoreState } from './useOSStore';

export interface BankingActions { bankAction: (command: BankCommand) => BankResult }
export function createBankingActions(set: (update: (state: OSStoreState) => Partial<OSStoreState>) => void, get: () => OSStoreState): BankingActions {
  return { bankAction: command => {
    if (!get().isLoggedIn) return { ok: false, message: 'Log in before moving credits.' };
    if (isWorldPaused()) return { ok: false, message: 'Resume the world before moving credits.' };
    let result: BankResult = { ok: false, message: 'Transaction could not be completed.' };
    set(state => {
      const outcome = executeBankCommand(state.gameplay.player, command);
      result = { ok: outcome.ok, message: outcome.message, entry: outcome.entry };
      return outcome.player ? { gameplay: { ...state.gameplay, player: outcome.player } } : {};
    });
    return result;
  } };
}
