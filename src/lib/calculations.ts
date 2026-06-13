export interface CommissionResult {
  totalFee: number;
  platformCommission: number;
  providerPayout: number;
  dpAmount: number;
}

export function calculateJobFinancials(dailyRate: number, estimatedDays: number): CommissionResult {
  const totalFee = dailyRate * estimatedDays;
  const baseCommission = totalFee * 0.1;
  const maxCommissionCap = 20_000 * estimatedDays;

  const platformCommission = Math.min(baseCommission, maxCommissionCap);
  const providerPayout = totalFee - platformCommission;
  const dpAmount = dailyRate * 1;

  return {
    totalFee,
    platformCommission,
    providerPayout,
    dpAmount,
  };
}
