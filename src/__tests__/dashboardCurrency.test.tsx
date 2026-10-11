/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { db } from '../db/db';

describe('Dashboard Currency (H1)', () => {
  beforeEach(async () => {
    await db.expenses.clear();
    await db.settlements.clear();
    await db.people.clear();
    await db.settings.clear();
  });

  it('renders configured USD currency symbol instead of hardcoded INR', async () => {
    const meId = crypto.randomUUID();
    const friendId = crypto.randomUUID();

    await db.settings.add({
      id: 'user_settings',
      defaultCurrency: 'USD',
      defaultCountryCode: '+1',
      whatsappTemplate: 'Hi {name}',
      theme: 'system',
      lastBackupAt: null,
    });

    await db.people.add({
      id: meId,
      name: 'Me',
      phone: null,
      avatarColor: '#4f46e5',
      source: 'manual',
      isMe: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      archivedAt: null,
      deletedAt: null,
    });

    await db.people.add({
      id: friendId,
      name: 'Bob',
      phone: null,
      avatarColor: '#10b981',
      source: 'manual',
      isMe: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      archivedAt: null,
      deletedAt: null,
    });

    await db.expenses.add({
      id: crypto.randomUUID(),
      groupId: null,
      description: 'Lunch in NY',
      amountMinor: 2500, // $25.00
      currency: 'USD',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: meId, amountMinor: 2500 }],
      shares: [{ personId: meId, amountMinor: 1250 }, { personId: friendId, amountMinor: 1250 }],
      participantIds: [meId, friendId],
      notes: '',
      splitType: 'equal',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for the currency, balances, and activity to load
    await waitFor(() => {
      expect(screen.getByText(/Lunch in NY/i)).toBeDefined();
      expect(screen.getAllByText(/\$12\.50/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\$25\.00/)).toBeDefined();
    });
  });
});
