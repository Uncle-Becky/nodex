import type { Memory } from '../agents/ReasoningAgent'; // Assuming Memory type is exported or accessible

const DB_NAME = 'AgentSystemDB';
const MEMORIES_STORE_NAME = 'agentMemories';

// Interface for Memory object as stored in IndexedDB (with agentId)
interface StoredMemory extends Memory {
  agentId: string;
}

export class IndexedDBService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this._openDb();
  }

  private async _openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1); // Version 1

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(MEMORIES_STORE_NAME)) {
          const store = db.createObjectStore(MEMORIES_STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('agentIdIdx', 'agentId', { unique: false });
        }
      };

      request.onsuccess = event => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = event => {
        console.error(
          'IndexedDB error:',
          (event.target as IDBOpenDBRequest).error
        );
        reject(new Error('Failed to open IndexedDB.'));
      };
    });
  }

  public async addMemory(agentId: string, memory: Memory): Promise<void> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(MEMORIES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(MEMORIES_STORE_NAME);

      const memoryToStore: StoredMemory = { ...memory, agentId };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(memoryToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        // Wait for transaction to complete
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('Failed to add memory to IndexedDB:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  public async getMemoriesByAgentId(agentId: string): Promise<Memory[]> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(MEMORIES_STORE_NAME, 'readonly');
      const store = tx.objectStore(MEMORIES_STORE_NAME);
      const index = store.index('agentIdIdx');

      return await new Promise<StoredMemory[]>((resolve, reject) => {
        const request = index.getAll(agentId);
        request.onsuccess = () =>
          resolve(
            request.result.map(m => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { agentId: _, ...memory } = m; // Strip agentId before returning
              return memory as Memory;
            })
          );
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(
        `Failed to get memories for agent ${agentId} from IndexedDB:`,
        error
      );
      return []; // Return empty array on error to prevent app crash
    }
  }

  public async deleteMemory(memoryId: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(MEMORIES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(MEMORIES_STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(memoryId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        // Wait for transaction to complete
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(
        `Failed to delete memory ${memoryId} from IndexedDB:`,
        error
      );
      throw error;
    }
  }

  public async clearMemoriesByAgentId(agentId: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(MEMORIES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(MEMORIES_STORE_NAME);
      const index = store.index('agentIdIdx');

      const cursorRequest = index.openCursor(IDBKeyRange.only(agentId));

      cursorRequest.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      return await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = event => {
          console.error(
            `Error clearing memories for agent ${agentId}:`,
            (event.target as IDBTransaction).error
          );
          reject(tx.error);
        };
      });
    } catch (error) {
      console.error(
        `Failed to clear memories for agent ${agentId} from IndexedDB:`,
        error
      );
      throw error;
    }
  }
}

// Export a singleton instance if preferred, or allow instantiation
// export const idbService = new IndexedDBService();
