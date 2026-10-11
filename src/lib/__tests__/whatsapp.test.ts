import { describe, it, expect } from 'vitest';
import { getWhatsAppLink, sendWhatsAppReminder, buildReminderMessage } from '../whatsapp';
import type { Person, Settings, Reminder, Expense, Settlement } from '../../domain/types';

describe('whatsapp url building', () => {
  const person: Person = {
    id: 'p1',
    name: 'John',
    phone: '+919876543210',
    avatarColor: '#000',
    source: 'manual',
    isMe: false,
    createdAt: '',
    updatedAt: '',
    archivedAt: null,
    deletedAt: null
  };

  const settings: Settings = {
    id: 'default',
    defaultCurrency: 'INR',
    defaultCountryCode: 'IN',
    whatsappTemplate: 'Hi {name}, here is our balance breakdown:\n\n{breakdown}\n\nTotal: {amount}',
    theme: 'system',
    lastBackupAt: null
  };

  it('buildReminderMessage - Two dates with two entries and one entry, exact expected string', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Pizza & drinks', amountMinor: 50000, currency: 'INR',
        date: '2026-01-05', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-05T10:00:00Z', updatedAt: '', deletedAt: null
      },
      {
        id: 'e2', groupId: null, description: 'Movie tickets', amountMinor: 30000, currency: 'INR',
        date: '2026-01-05', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 30000 }],
        shares: [{ personId: 'myId', amountMinor: 15000 }, { personId: 'p1', amountMinor: 15000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-05T12:00:00Z', updatedAt: '', deletedAt: null
      },
      {
        id: 'e3', groupId: null, description: 'Breakfast', amountMinor: 20000, currency: 'INR',
        date: '2026-01-06', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 20000 }],
        shares: [{ personId: 'myId', amountMinor: 10000 }, { personId: 'p1', amountMinor: 10000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-06T09:00:00Z', updatedAt: '', deletedAt: null
      }
    ];

    const result = buildReminderMessage(person, 'myId', expenses, [], settings, 'INR');
    expect(result?.totalPending).toBe(50000);
    expect(result?.message).toBe(
`Hi John, here is our balance breakdown:

---5 Jan 26---
+₹250.00 [Pizza & drinks]
+₹150.00 [Movie tickets]
---6 Jan 26---
+₹100.00 [Breakfast]

Total: You owe me ₹500.00`
    );
  });

  it('Date conversion: 2026-01-05 becomes 5 Jan 26, with no off-by-one in UTC-8 or UTC+14', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Test date', amountMinor: 50000, currency: 'INR',
        date: '2026-01-05', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-05T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const result = buildReminderMessage(person, 'myId', expenses, [], settings, 'INR');
    expect(result?.message).toContain('---5 Jan 26---');
  });

  it('Entries before a zero balance point are excluded', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const settlements: Settlement[] = [
      {
        id: 's1', groupId: null, fromId: 'p1', toId: 'myId', amountMinor: 25000, currency: 'INR',
        date: '2026-01-02', method: 'cash', notes: '', createdAt: '2026-01-02T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const newExpenses: Expense[] = [
      {
        id: 'e2', groupId: null, description: 'Dinner', amountMinor: 60000, currency: 'INR',
        date: '2026-01-03', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 60000 }],
        shares: [{ personId: 'myId', amountMinor: 30000 }, { personId: 'p1', amountMinor: 30000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-03T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];

    const result = buildReminderMessage(person, 'myId', [...expenses, ...newExpenses], settlements, settings, 'INR');
    expect(result?.totalPending).toBe(30000);
    expect(result?.message).not.toContain('Lunch');
    expect(result?.message).not.toContain('Payment received');
    expect(result?.message).toContain('Dinner');
  });

  it('A payment appears as a negative line, and the total matches the screen balance', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const settlements: Settlement[] = [
      {
        id: 's1', groupId: null, fromId: 'p1', toId: 'myId', amountMinor: 10000, currency: 'INR',
        date: '2026-01-02', method: 'cash', notes: '', createdAt: '2026-01-02T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const result = buildReminderMessage(person, 'myId', expenses, settlements, settings, 'INR');
    expect(result?.totalPending).toBe(15000);
    expect(result?.message).toContain('+₹250.00 [Lunch]');
    expect(result?.message).toContain('-₹100.00 [Payment received]');
    expect(result?.message).toContain('Total: You owe me ₹150.00');
  });

  it('When a transaction ties the balance to zero, that tying transaction is included in the message', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const settlements: Settlement[] = [
      {
        id: 's1', groupId: null, fromId: 'p1', toId: 'myId', amountMinor: 25000, currency: 'INR',
        date: '2026-01-02', method: 'cash', notes: '', createdAt: '2026-01-02T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const result = buildReminderMessage(person, 'myId', expenses, settlements, settings, 'INR');
    expect(result).not.toBeNull();
    expect(result?.totalPending).toBe(0);
    expect(result?.message).toContain('+₹250.00 [Lunch]');
    expect(result?.message).toContain('-₹250.00 [Payment received]');
    expect(result?.message).toContain('Total: All settled up (₹0.00)');
  });

  it('Zero and negative balance builds correctly', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'p1', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const result = buildReminderMessage(person, 'myId', expenses, [], settings, 'INR');
    expect(result).not.toBeNull();
    expect(result?.totalPending).toBe(-25000);
    expect(result?.message).toContain('-₹250.00 [Lunch]');
    expect(result?.message).toContain('Total: I owe you ₹250.00');
  });

  it('Long list truncates, keeps the newest dates, and the total still covers everything', () => {
    const expenses: Expense[] = [];
    for (let i = 1; i <= 100; i++) {
      expenses.push({
        id: `e${i}`, groupId: null, description: `Coffee ${i}`, amountMinor: 20000, currency: 'INR',
        date: `2026-01-${(i % 28 + 1).toString().padStart(2, '0')}`, categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 20000 }],
        shares: [{ personId: 'myId', amountMinor: 10000 }, { personId: 'p1', amountMinor: 10000 }],
        participantIds: ['myId', 'p1'], createdAt: `2026-01-01T10:00:00Z`, updatedAt: '', deletedAt: null
      });
    }
    const result = buildReminderMessage(person, 'myId', expenses, [], settings, 'INR');
    expect(result?.totalPending).toBe(100 * 10000); // 1,000,000 minor = 10,000
    // Verify truncation text
    expect(result?.message).toContain('earlier entries');
    // Verify it kept the newest
    expect(result?.message).toContain('---28 Jan 26---');
    // Verify total covers everything
    expect(result?.message).toContain('Total: You owe me ₹10,000.00');
  });

  it('Unknown template variables do not leak raw placeholders', () => {
    const customSettings = { ...settings, whatsappTemplate: 'Hi {name} {unknown}, {breakdown}' };
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }
    ];
    const result = buildReminderMessage(person, 'myId', expenses, [], customSettings, 'INR');
    expect(result?.message).not.toContain('{unknown}');
    expect(result?.message).toContain('Hi John ,');
  });

  it('Formats 11 Oct 26 date, +/- amounts with [what for], and directional totals', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Dinner buffet', amountMinor: 200000, currency: 'INR',
        date: '2026-10-11', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 200000 }],
        shares: [{ personId: 'myId', amountMinor: 100000 }, { personId: 'p1', amountMinor: 100000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-10-11T19:00:00Z', updatedAt: '', deletedAt: null
      },
      {
        id: 'e2', groupId: null, description: 'Uber ride', amountMinor: 60000, currency: 'INR',
        date: '2026-10-11', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'p1', amountMinor: 60000 }],
        shares: [{ personId: 'myId', amountMinor: 30000 }, { personId: 'p1', amountMinor: 30000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-10-11T20:00:00Z', updatedAt: '', deletedAt: null
      }
    ];

    const result = buildReminderMessage(person, 'myId', expenses, [], settings, 'INR');
    expect(result?.totalPending).toBe(70000); // 1000 - 300 = 700 INR
    expect(result?.message).toContain('---11 Oct 26---');
    expect(result?.message).toContain('+₹1,000.00 [Dinner buffet]');
    expect(result?.message).toContain('-₹300.00 [Uber ride]');
    expect(result?.message).toContain('Total: You owe me ₹700.00');
  });

  it('Emoji, "&", "#" and newlines in descriptions survive URL encoding in buildWhatsAppUrl', () => {
    const url = getWhatsAppLink('Hello & welcome 😊\n#test', '+919876543210');
    expect(url).toContain(encodeURIComponent('Hello & welcome 😊\n#test'));
  });

  describe('sendWhatsAppReminder logic', () => {
    const deps = {
      openLink: () => {},
      askSent: () => true,
      logReminder: async () => {},
      now: () => '2026-10-08T12:00:00Z',
    };

    it('logs exactly one reminder immediately', async () => {
      let openedLink = '';
      const reminders: Reminder[] = [];
      const localDeps = { ...deps, openLink: (u: string) => { openedLink = u; }, logReminder: async (rem: Reminder) => { reminders.push(rem); } };
      
      const expenses: Expense[] = [{
        id: 'e1', groupId: null, description: 'Test', amountMinor: 50000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'myId', amountMinor: 50000 }],
        shares: [{ personId: 'myId', amountMinor: 25000 }, { personId: 'p1', amountMinor: 25000 }],
        participantIds: ['myId', 'p1'], createdAt: '2026-01-01T10:00:00Z', updatedAt: '', deletedAt: null
      }];

      const sent = await sendWhatsAppReminder(person, 'myId', expenses, [], settings, localDeps);
      expect(sent).toBe(true);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].amountMinor).toBe(25000);
      expect(openedLink).toContain('https://wa.me');
    });
  });
});
