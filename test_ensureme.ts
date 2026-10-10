import 'fake-indexeddb/auto';
import { db } from './src/db/db';
import { ensureMe } from './src/db/repositories';

async function run() {
  try {
    await db.people.clear();
    await db.people.add({
      id: 'raj',
      name: 'Raj',
      phone: null,
      avatarColor: 'blue',
      source: 'manual',
      isMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      deletedAt: null
    } as any);
    
    await ensureMe();
    
    const people = await db.people.toArray();
    console.log('Success! People:', people);
  } catch (e) {
    console.error('Error in ensureMe:', e);
  }
}
run();
