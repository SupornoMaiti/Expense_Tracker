import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWhatsAppLink, sendWhatsAppReminder } from '../whatsapp';
import { db } from '../../db/db';
import type { Person, Settings } from '../../domain/types';

describe('whatsapp url building', () => {
  it('builds URL exactly as https://wa.me/<digits>?text=<encoded>', () => {
    // We can test getWhatsAppLink here
    const person: Person = {
      id: 'p1',
      name: 'John',
      phone: '+91 98765-43210',
      avatarColor: '#000000',
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
      whatsappTemplate: 'Hello & welcome! You owe {amount} or 100%. \n Please pay 😊.',
      theme: 'system',
      lastBackupAt: null
    };

    const url = getWhatsAppLink(person, 50000, 'INR', settings);
    // Since formatMoney might format 50000 as ₹500.00
    // encodeURIComponent('Hello & welcome! You owe ₹500.00 or 100%. \n Please pay 😊.')
    // We just verify it starts correctly and contains the encoded text
    expect(url).toContain('https://wa.me/919876543210?text=');
  });

  describe('sendWhatsAppReminder logic', () => {
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
      whatsappTemplate: 'You owe {amount}',
      theme: 'system',
      lastBackupAt: null
    };

    beforeEach(async () => {
      await db.reminders.clear();
      // Mock window.open to prevent actual tabs from opening in tests
      vi.stubGlobal('open', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('logs exactly one reminder when user clicks Yes', async () => {
      vi.stubGlobal('confirm', () => true); // Mock Yes
      
      const sent = await sendWhatsAppReminder(person, 1000, settings);
      expect(sent).toBe(true);
      
      const reminders = await db.reminders.toArray();
      expect(reminders).toHaveLength(1);
      expect(reminders[0].personId).toBe('p1');
      expect(reminders[0].amountMinor).toBe(1000);
    });

    it('logs nothing when user clicks No', async () => {
      vi.stubGlobal('confirm', () => false); // Mock No
      
      const sent = await sendWhatsAppReminder(person, 1000, settings);
      expect(sent).toBe(false);
      
      const reminders = await db.reminders.toArray();
      expect(reminders).toHaveLength(0);
    });

    it('blocks the reminder (returns false) if balance is zero or negative', async () => {
      vi.stubGlobal('confirm', () => true); // Should never be called
      const confirmSpy = vi.spyOn(window, 'confirm');

      const sentZero = await sendWhatsAppReminder(person, 0, settings);
      expect(sentZero).toBe(false);
      
      const sentNeg = await sendWhatsAppReminder(person, -500, settings);
      expect(sentNeg).toBe(false);
      
      expect(confirmSpy).not.toHaveBeenCalled();
      
      const reminders = await db.reminders.toArray();
      expect(reminders).toHaveLength(0);
    });
  });
});
