import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Person } from '../domain/types';

export function useDBInit() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const count = await db.people.count();
        if (count === 0) {
          // Create the "Me" profile automatically on first launch
          const me: Person = {
            id: crypto.randomUUID(),
            name: 'Me',
            phone: null,
            avatarColor: '#4f46e5', // indigo-600
            source: 'manual',
            isMe: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archivedAt: null,
            deletedAt: null,
          };
          
          await db.people.add(me);

          // Seed default settings
          await db.settings.add({
            id: 'user_settings',
            defaultCurrency: 'INR',
            defaultCountryCode: '+91',
            whatsappTemplate: 'Hey {name}, just a friendly reminder that you owe {amount} {currency} for {group}. Please send it when you can!',
            theme: 'system',
            lastBackupAt: null
          });
        }
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize local DB:', err);
        // We could handle quota errors here
        setIsInitialized(true); // Still let it load, let error boundary catch it if db is fully broken
      }
    }
    
    init();
  }, []);

  return isInitialized;
}
