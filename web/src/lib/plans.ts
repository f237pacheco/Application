export type PlanId = 'starter' | 'pro' | 'enterprise';
export type AccountType = 'individual' | 'professional';
export type Billing = 'monthly' | 'annual';

export interface PlanPrice {
  individual: number;
  professional: number;
}

export interface Plan {
  id: PlanId;
  color: string;
  borderColor: string;
  recommended?: boolean;
  prices: PlanPrice; // in euros, monthly
  featuresKey: string[];
  generationsPerMonth: number | null; // null = unlimited
  servicesCount: number | null;       // null = all
  requiresBusinessInfo: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    color: '#4b5563',
    borderColor: 'border-gray-700',
    prices: { individual: 29, professional: 49 },
    featuresKey: ['plans.starter.features'],
    generationsPerMonth: 5,
    servicesCount: 2,
    requiresBusinessInfo: false,
  },
  {
    id: 'pro',
    color: '#6C5CE7',
    borderColor: 'border-primary-500',
    recommended: true,
    prices: { individual: 79, professional: 129 },
    featuresKey: ['plans.pro.features'],
    generationsPerMonth: 30,
    servicesCount: null,
    requiresBusinessInfo: false,
  },
  {
    id: 'enterprise',
    color: '#00B894',
    borderColor: 'border-success-500',
    prices: { individual: 299, professional: 299 },
    featuresKey: ['plans.enterprise.features'],
    generationsPerMonth: null,
    servicesCount: null,
    requiresBusinessInfo: true,
  },
];

export function getPrice(
  plan: Plan,
  accountType: AccountType,
  billing: Billing
): number {
  const monthly = plan.prices[accountType];
  if (billing === 'annual') return Math.round(monthly * 12 * 0.8); // 20% off
  return monthly;
}

export function getMonthlyEquivalent(
  plan: Plan,
  accountType: AccountType
): number {
  return Math.round(plan.prices[accountType] * 0.8);
}

/** Maps Plan + AccountType → backend plan key */
export function toPlanKey(planId: PlanId, accountType: AccountType): string {
  if (planId === 'enterprise') return 'enterprise';
  return `${planId}_${accountType}`;
}
