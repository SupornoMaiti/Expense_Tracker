/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Activity from '../pages/Activity';
import PersonDetail from '../pages/PersonDetail';
import { db } from '../db/db';

describe('Activity Share View and Friend Settlement Reset', () => {
  const meId = 'me-test-id';
  const friendId = 'friend-test-id';
  const otherId = 'other-test-id';

  afterEach(() => {
    cleanup();
  });

  beforeEach(async () => {
    await db.expenses.clear();
    await db.settlements.clear();
    await db.people.clear();
    await db.settings.clear();
    await db.reminders.clear();

    await db.settings.add({
      id: 'user_settings',
      defaultCurrency: 'INR',
      defaultCountryCode: '+91',
      whatsappTemplate: 'Hi {name}',
      theme: 'system',
      lastBackupAt: null,
    });

    await db.people.bulkAdd([
      {
        id: meId,
        name: 'Suporno',
        phone: null,
        avatarColor: '#4f46e5',
        source: 'manual',
        isMe: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        archivedAt: null,
        deletedAt: null,
      },
      {
        id: friendId,
        name: 'Priya',
        phone: null,
        avatarColor: '#10b981',
        source: 'manual',
        isMe: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        archivedAt: null,
        deletedAt: null,
      },
      {
        id: otherId,
        name: 'Third Person',
        phone: null,
        avatarColor: '#f59e0b',
        source: 'manual',
        isMe: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        archivedAt: null,
        deletedAt: null,
      },
    ]);
  });

  describe('Feature 1: Activity Tab (My Share & User Transactions)', () => {
    it('shows user share by default and filters to transactions involving user', async () => {
      // Expense 1: ₹1,000 lunch between Me and Priya (500 each, Priya paid)
      await db.expenses.add({
        id: 'exp-1',
        groupId: null,
        description: 'Team Lunch',
        amountMinor: 100000, // ₹1,000.00
        currency: 'INR',
        date: '01-01-2026',
        categoryId: 'cat-1',
        payers: [{ personId: friendId, amountMinor: 100000 }],
        shares: [
          { personId: meId, amountMinor: 50000 },
          { personId: friendId, amountMinor: 50000 },
        ],
        participantIds: [meId, friendId],
        splitType: 'equal',
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:00:00Z',
        deletedAt: null,
      });

      // Expense 2: Between Priya and Third Person only (Me is not involved)
      await db.expenses.add({
        id: 'exp-2',
        groupId: null,
        description: 'Private Trip',
        amountMinor: 200000,
        currency: 'INR',
        date: '01-01-2026',
        categoryId: 'cat-1',
        payers: [{ personId: friendId, amountMinor: 200000 }],
        shares: [
          { personId: friendId, amountMinor: 100000 },
          { personId: otherId, amountMinor: 100000 },
        ],
        participantIds: [friendId, otherId],
        splitType: 'equal',
        createdAt: '2026-01-01T13:00:00Z',
        updatedAt: '2026-01-01T13:00:00Z',
        deletedAt: null,
      });

      render(
        <MemoryRouter>
          <Activity />
        </MemoryRouter>
      );

      // In default "My Share" mode:
      await waitFor(() => {
        expect(screen.getByText('Team Lunch')).toBeDefined();
      });

      // Private Trip should NOT be in My Share view
      expect(screen.queryByText('Private Trip')).toBeNull();

      // Check My Share amount for Team Lunch (₹500.00)
      expect(screen.getByText('₹500.00')).toBeDefined();
      expect(screen.getByText(/Your share of ₹1,000\.00/i)).toBeDefined();
      expect(screen.getByText(/Priya paid ₹1,000\.00/i)).toBeDefined();

      // Switch to "Total Expense" mode
      const totalExpenseBtn = screen.getByRole('button', { name: /Total Expense/i });
      fireEvent.click(totalExpenseBtn);

      await waitFor(() => {
        // Now Private Trip is visible too
        expect(screen.getByText('Private Trip')).toBeDefined();
      });

      // Total expense should show full ₹1,000.00
      expect(screen.getByText('₹1,000.00')).toBeDefined();
      expect(screen.getAllByText(/Total expense/i).length).toBeGreaterThan(0);
    });
  });

  describe('Feature 2: Friend Section (Amount to be Settled & Reset after Settlement)', () => {
    it('shows Amount to be Settled and resets subcards after settlement', async () => {
      // Add shared expense: Me paid ₹2,000, split 50/50 with Priya -> Priya owes Me ₹1,000
      await db.expenses.add({
        id: 'exp-friend-1',
        groupId: null,
        description: 'Dinner at Posthouse',
        amountMinor: 200000,
        currency: 'INR',
        date: '01-01-2026',
        categoryId: 'cat-1',
        payers: [{ personId: meId, amountMinor: 200000 }],
        shares: [
          { personId: meId, amountMinor: 100000 },
          { personId: friendId, amountMinor: 100000 },
        ],
        participantIds: [meId, friendId],
        splitType: 'equal',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
        deletedAt: null,
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/friends/${friendId}`]}>
          <Routes>
            <Route path="/friends/:id" element={<PersonDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify "Amount to be Settled" is displayed with ₹1,000.00
      await waitFor(() => {
        expect(screen.getByText(/Amount to be Settled/i)).toBeDefined();
      });
      expect(screen.getAllByText('₹1,000.00').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/Priya owes you/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/From shared expenses/i).length).toBe(2);

      unmount();

      // Now Priya settles up full ₹1,000
      await db.settlements.add({
        id: 'settlement-1',
        fromId: friendId,
        toId: meId,
        amountMinor: 100000,
        currency: 'INR',
        date: '02-01-2026',
        method: 'other',
        createdAt: '2026-01-02T10:00:00Z',
        updatedAt: '2026-01-02T10:00:00Z',
        deletedAt: null,
      });

      render(
        <MemoryRouter initialEntries={[`/friends/${friendId}`]}>
          <Routes>
            <Route path="/friends/:id" element={<PersonDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify after settlement, netBalance is 0 and subcards reset to ₹0.00
      await waitFor(() => {
        expect(screen.getAllByText(/Settled up/i).length).toBeGreaterThanOrEqual(1);
      });

      // Amount to be Settled should be ₹0.00
      expect(screen.getAllByText('₹0.00').length).toBeGreaterThanOrEqual(3);
    });
  });
});
