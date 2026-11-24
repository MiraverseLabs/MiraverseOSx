export const WORK_PAY_RULES = { hourlyRate: 40, partialStageRate: 35, civicLevyRate: 0.05 } as const;
export const formatDutyReward = (reward: { rewardCredits: number; rewardXP: number }) => `+${reward.rewardCredits} ₢ · +${reward.rewardXP} Career XP`;
export const formatDelegationReward = (reward: { rewardCredits: number; rewardMerit: number }) => `+${reward.rewardMerit} Department Merit · +${reward.rewardCredits} ₢`;

/** A single entitlement can be settled through any participating app only once. */
export function hasWorkReceipt(player: any, orderId: string, payroll: { claimId: string }[] = []): boolean {
  return Boolean(player?.compensationReceiptIds?.includes(orderId) || player?.rewardedWorkOrderIds?.includes(orderId) || payroll.some(e => e.claimId === `PARTIAL:${orderId}`));
}
