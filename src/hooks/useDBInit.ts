import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { ensureMe, ensureDefaultCategories, seedSampleData } from '../db/repositories';

export function useDBInit() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await ensureMe();
        await ensureDefaultCategories();

        const count = await db.settings.count();
        if (count === 0) {
          // Seed default settings
          await db.settings.add({
            id: 'user_settings',
            defaultCurrency: 'INR',
            defaultCountryCode: '+91',
            whatsappTemplate: 'Hi {name}, here is your pending balance:\n\n{breakdown}\n\nTotal pending: {amount}',
            theme: 'system',
            lastBackupAt: null
          });
        }

        const friendCount = await db.people.filter(p => !p.isMe && !p.deletedAt).count();
        if (friendCount === 0) {
          await seedSampleData();
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize local DB:', err);
        setIsInitialized(true); 
      }
    }
    
    init();
  }, []);

  return isInitialized;
}
