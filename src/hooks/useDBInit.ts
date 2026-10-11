import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { ensureMe, ensureDefaultCategories } from '../db/repositories';

export function useDBInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
            whatsappTemplate: 'Hi {name}, here is our balance breakdown:\n\n{breakdown}\n\nTotal: {amount}',
            theme: 'system',
            lastBackupAt: null
          });
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize local DB:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    
    init();
  }, []);

  return { isInitialized, error };
}
