// Valores tomados de mock-api/bcp-wallet-mock-openapi.yaml (componentes Kyc, Wallet, Payment, Event, LedgerEntry, SupportCase, Incident).
export const CURRENCY = 'PEN';
export const MIN_AMOUNT_CENTS = 1;
export const MAX_AMOUNT_CENTS = 100_000_000;

export const DOCUMENT_TYPES = ['TEST', 'DNI'] as const;
export const KYC_SCENARIOS = ['APPROVED', 'REJECTED', 'MANUAL_REVIEW'] as const;
export const WALLET_STATUSES = ['ACTIVE', 'PENDING', 'REJECTED'] as const;
export const RECIPIENT_KINDS = ['CONTACT', 'MERCHANT'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'REJECTED', 'REVERSED'] as const;
export const REVERSAL_STATUSES = ['PENDING', 'SUCCEEDED'] as const;
export const EVENT_TARGETS = ['SUCCEEDED', 'REJECTED', 'REVERSED'] as const;
export const LEDGER_KINDS = ['FUNDING', 'PAYMENT', 'REVERSAL'] as const;
export const SUPPORT_REASONS = ['KYC_REVIEW', 'UNKNOWN_PAYMENT_RESULT', 'PROVIDER_PENDING'] as const;
export const CASE_STATUSES = ['OPEN', 'RESOLVED'] as const;
export const INCIDENT_REASONS = [
  'DUPLICATE_PROVIDER',
  'MISSING_WALLET',
  'MISSING_PROVIDER',
  'AMOUNT_MISMATCH',
  'STATUS_MISMATCH',
  'LEDGER_MISMATCH',
  'LEDGER_UNBALANCED',
  'BALANCE_MISMATCH',
] as const;
export const SETTLEMENT_MODES = ['AMOUNT', 'MISSING', 'DUPLICATE', 'ORPHAN'] as const;
export const ONBOARDING_STATUSES = ['EN_CURSO', 'COMPLETADO'] as const;
export const ONBOARDING_EVENT_TYPES = ['onboarding_started', 'onboarding_step_completed', 'onboarding_completed'] as const;
export const ONBOARDING_STEPS = ['datos', 'identidad', 'verificacion'] as const;

export const inList = (column: string, values: readonly string[]) =>
  `"${column}" IN (${values.map((value) => `'${value}'`).join(', ')})`;
