import type { Household, Profile, Settlement } from "./types";

/** Porción del gasto compartido que le corresponde a un miembro (0–1) */
export function shareOf(household: Household, userId: string) {
  return userId === household.created_by
    ? Number(household.creator_share)
    : 1 - Number(household.creator_share);
}

export type BalanceResult = {
  debtor: Profile;
  creditor: Profile;
  amount: number;
} | null;

/**
 * Calcula quién le debe a quién, considerando todos los gastos
 * compartidos históricos y los pagos de "saldar cuentas".
 */
export function computeBalance(
  household: Household,
  members: Profile[],
  sharedExpenses: { amount: number; paid_by: string }[],
  settlements: Settlement[]
): BalanceResult {
  if (members.length < 2) return null;
  const creator = members.find((m) => m.id === household.created_by);
  const partner = members.find((m) => m.id !== household.created_by);
  if (!creator || !partner) return null;

  const creatorShare = Number(household.creator_share);
  // positivo => la pareja le debe al creador del hogar
  let owedToCreator = 0;

  for (const e of sharedExpenses) {
    const amount = Number(e.amount);
    if (e.paid_by === creator.id) owedToCreator += amount * (1 - creatorShare);
    else owedToCreator -= amount * creatorShare;
  }

  for (const s of settlements) {
    const amount = Number(s.amount);
    if (s.from_user === partner.id) owedToCreator -= amount;
    else owedToCreator += amount;
  }

  if (Math.abs(owedToCreator) < 0.01) return null;
  return owedToCreator > 0
    ? { debtor: partner, creditor: creator, amount: owedToCreator }
    : { debtor: creator, creditor: partner, amount: -owedToCreator };
}
