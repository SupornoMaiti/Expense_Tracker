export interface Person {
  id: string;
  name: string;
  phone: string | null;
  avatarColor: string;
  source: 'manual' | 'contact_picker' | 'vcf' | 'csv';
  isMe: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  members: string[]; // Person IDs
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExpensePayer {
  personId: string;
  amountMinor: number;
}

export interface ExpenseShare {
  personId: string;
  amountMinor: number;
  rawValue?: number;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface Expense {
  id: string;
  groupId: string | null;
  description: string;
  amountMinor: number;
  currency: string;
  date: string; // DD-MM-YYYY
  categoryId: string;
  payers: ExpensePayer[];
  shares: ExpenseShare[];
  participantIds: string[];
  notes: string;
  splitType: SplitType;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  refundOfId?: string | null;
  isRefund?: boolean;
}

export interface Settlement {
  id: string;
  groupId: string | null;
  fromId: string;
  toId: string;
  amountMinor: number;
  currency: string;
  date: string; // DD-MM-YYYY
  method: 'cash' | 'upi' | 'bank' | 'other';
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  expenseId?: string | null;
  refundOfId?: string | null;
}

export interface Reminder {
  id: string;
  personId: string;
  groupId: string | null;
  amountMinor: number;
  currency: string;
  messageSnapshot: string;
  sentAt: string;
}

export interface Receipt {
  expenseId: string;
  blob: Blob;
  mimeType: string;
}

export interface Settings {
  id: string;
  defaultCurrency: string;
  defaultCountryCode: string;
  whatsappTemplate: string;
  theme: 'light' | 'dark' | 'system';
  lastBackupAt: string | null;
}
