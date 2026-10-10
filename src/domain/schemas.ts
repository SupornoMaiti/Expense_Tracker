import { z } from 'zod';

// Strict Integer check since all money is in minor units
const AmountMinorSchema = z.number().int().nonnegative();
const CurrencySchema = z.string().min(1).max(5).toUpperCase();
const DateSchema = z.string().regex(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/, 'Date must be DD-MM-YYYY or YYYY-MM-DD');

const ExpensePayerSchema = z.object({
  personId: z.string().uuid(),
  amountMinor: AmountMinorSchema,
});

const ExpenseShareSchema = z.object({
  personId: z.string().uuid(),
  amountMinor: AmountMinorSchema,
  rawValue: z.number().optional(),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
  description: z.string().min(1, 'Description is required').max(255),
  amountMinor: AmountMinorSchema.refine(val => val > 0, 'Expense amount must be greater than 0'),
  currency: CurrencySchema,
  date: DateSchema,
  categoryId: z.string().uuid(),
  payers: z.array(ExpensePayerSchema).min(1, 'At least one payer is required'),
  shares: z.array(ExpenseShareSchema).min(1, 'At least one share is required'),
  participantIds: z.array(z.string().uuid()),
  notes: z.string().max(1000),
  splitType: z.enum(['equal', 'exact', 'percentage', 'shares'] as const),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  refundOfId: z.string().uuid().nullable().optional(),
  isRefund: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const sumPayers = data.payers.reduce((acc, p) => acc + p.amountMinor, 0);
  if (sumPayers !== data.amountMinor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Sum of payers (${sumPayers}) must equal expense amount (${data.amountMinor})`,
      path: ['payers']
    });
  }

  const sumShares = data.shares.reduce((acc, s) => acc + s.amountMinor, 0);
  if (sumShares !== data.amountMinor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Sum of shares (${sumShares}) must equal expense amount (${data.amountMinor})`,
      path: ['shares']
    });
  }
});

export const SettlementSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amountMinor: AmountMinorSchema.refine(val => val > 0, 'Settlement amount must be greater than 0'),
  currency: CurrencySchema,
  date: DateSchema,
  method: z.enum(['cash', 'upi', 'bank', 'other'] as const),
  notes: z.string().max(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  expenseId: z.string().uuid().nullable().optional(),
  refundOfId: z.string().uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.fromId === data.toId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Sender and receiver must be different',
      path: ['toId']
    });
  }
});
