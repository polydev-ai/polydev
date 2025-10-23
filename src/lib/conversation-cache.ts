/**
 * IndexedDB-backed Conversation Cache
 * Stores and retrieves conversation history for long threads
 */

export interface CachedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastModel?: string;
}

const DB_NAME = 'polydev-chat';
const DB_VERSION = 1;
const STORE_MESSAGES = 'messages';
const STORE_SESSIONS = 'sessions';

class ConversationCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create messages store
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const messageStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
          messageStore.createIndex('sessionId', 'sessionId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create sessions store
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        }
      };
    });

    await this.initPromise;
  }

  /**
   * Create a new conversation session
   */
  async createSession(title: string): Promise<ConversationSession> {
    await this.ensureDb();

    const session: ConversationSession = {
      id: `session-${Date.now()}`,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_SESSIONS], 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const request = store.add(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(session);
    });
  }

  /**
   * Add a message to a session
   */
  async addMessage(
    sessionId: string,
    message: CachedMessage
  ): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_MESSAGES, STORE_SESSIONS], 'readwrite');

      // Add message
      const messageStore = tx.objectStore(STORE_MESSAGES);
      const msgRequest = messageStore.add({ ...message, sessionId });

      msgRequest.onerror = () => reject(msgRequest.error);

      // Update session
      const sessionStore = tx.objectStore(STORE_SESSIONS);
      const sessionRequest = sessionStore.get(sessionId);

      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result;
        if (session) {
          session.messageCount = (session.messageCount || 0) + 1;
          session.updatedAt = new Date();
          session.lastModel = message.model;
          sessionStore.put(session);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all messages for a session
   */
  async getMessages(sessionId: string): Promise<CachedMessage[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_MESSAGES], 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const messages = request.result.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        resolve(messages);
      };
    });
  }

  /**
   * Get messages with pagination (for virtualization)
   */
  async getMessagesPaginated(
    sessionId: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<{ messages: CachedMessage[]; total: number }> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_MESSAGES], 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const allMessages = request.result.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const total = allMessages.length;
        const messages = allMessages.slice(offset, offset + limit);
        resolve({ messages, total });
      };
    });
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<ConversationSession[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_SESSIONS], 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(sessions);
      };
    });
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_MESSAGES, STORE_SESSIONS], 'readwrite');

      // Delete all messages for session
      const messageStore = tx.objectStore(STORE_MESSAGES);
      const index = messageStore.index('sessionId');
      const deleteRequest = index.openCursor(sessionId);

      deleteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete session
      const sessionStore = tx.objectStore(STORE_SESSIONS);
      sessionStore.delete(sessionId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_MESSAGES, STORE_SESSIONS], 'readwrite');

      tx.objectStore(STORE_MESSAGES).clear();
      tx.objectStore(STORE_SESSIONS).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Export session as JSON
   */
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.getMessages(sessionId);
    return JSON.stringify(session, null, 2);
  }

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }
}

export const conversationCache = new ConversationCache();
