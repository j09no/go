interface DBSchema {
  files: {
    id: number;
    name: string;
    type: "folder" | "pdf" | "image" | "document";
    size?: string;
    path: string;
    createdAt: Date;
  };
  folders: {
    id: number;
    name: string;
    path: string;
    createdAt: Date;
  };
  messages: {
    id: number;
    text: string;
    timestamp: Date;
    sender: "user";
  };
  subjects: {
    id: number;
    name: string;
    color: string;
  };
  chapters: {
    id: number;
    subjectId: number;
    title: string;
    description: string;
    progress: number;
    totalQuestions: number;
    difficulty: string;
  };
  questions: {
    id: number;
    chapterId: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  };
  quizSessions: {
    id: number;
    chapterId: number;
    totalQuestions: number;
    currentQuestion: number;
    score: number;
    isCompleted: boolean;
    createdAt: Date;
  };
  quizAnswers: {
    id: number;
    sessionId: number;
    questionId: number;
    selectedAnswer: number;
    isCorrect: boolean;
  };
  quizStats: {
    id: number;
    date: Date;
    chapterTitle: string;
    subjectTitle: string;
    score: number;
    totalQuestions: number;
    percentage: number;
  };
  studySessions: {
    id: number;
    chapterId: number;
    duration: number;
    date: Date;
  };
  scheduleEvents: {
    id: number;
    title: string;
    description?: string;
    date: Date;
    time: string;
    type: string;
  };
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbName = 'StudyAppDB';
  private version = 1;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) {
          throw new Error('IndexedDB is not supported in this browser');
        }

        const request = window.indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          reject(new Error('Failed to open IndexedDB: ' + (request.error?.message || 'Unknown error')));
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('IndexedDB opened successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log('IndexedDB upgrade needed, creating object stores');

          // Create object stores with error handling
          try {
            if (!db.objectStoreNames.contains('files')) {
              const filesStore = db.createObjectStore('files', { keyPath: 'id' });
              filesStore.createIndex('path', 'path');
            }

            if (!db.objectStoreNames.contains('folders')) {
              const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
              foldersStore.createIndex('path', 'path');
            }

            if (!db.objectStoreNames.contains('messages')) {
              db.createObjectStore('messages', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('subjects')) {
              db.createObjectStore('subjects', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('chapters')) {
              const chaptersStore = db.createObjectStore('chapters', { keyPath: 'id' });
              chaptersStore.createIndex('subjectId', 'subjectId');
            }

            if (!db.objectStoreNames.contains('questions')) {
              const questionsStore = db.createObjectStore('questions', { keyPath: 'id' });
              questionsStore.createIndex('chapterId', 'chapterId');
            }

            if (!db.objectStoreNames.contains('quizSessions')) {
              const quizSessionsStore = db.createObjectStore('quizSessions', { keyPath: 'id' });
              quizSessionsStore.createIndex('chapterId', 'chapterId');
            }

            if (!db.objectStoreNames.contains('quizAnswers')) {
              const quizAnswersStore = db.createObjectStore('quizAnswers', { keyPath: 'id' });
              quizAnswersStore.createIndex('sessionId', 'sessionId');
            }

            if (!db.objectStoreNames.contains('quizStats')) {
              const quizStatsStore = db.createObjectStore('quizStats', { keyPath: 'id' });
              quizStatsStore.createIndex('date', 'date');
            }

            if (!db.objectStoreNames.contains('studySessions')) {
              const studySessionsStore = db.createObjectStore('studySessions', { keyPath: 'id' });
              studySessionsStore.createIndex('chapterId', 'chapterId');
            }

            if (!db.objectStoreNames.contains('scheduleEvents')) {
              const scheduleEventsStore = db.createObjectStore('scheduleEvents', { keyPath: 'id' });
              scheduleEventsStore.createIndex('date', 'date');
            }
          } catch (storeError) {
            console.error('Error creating object stores:', storeError);
            reject(storeError);
          }
        };
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private async getStore<T extends keyof DBSchema>(storeName: T, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], mode);

    transaction.onerror = () => {
      console.error(`Transaction error for store ${storeName}:`, transaction.error);
    };

    return transaction.objectStore(storeName);
  }

  async getAll<T extends keyof DBSchema>(storeName: T): Promise<DBSchema[T][]> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => {
          console.error(`Error getting all from ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          const results = request.result.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
          }));
          resolve(results);
        };
      });
    } catch (error) {
      console.error(`Error in getAll for ${storeName}:`, error);
      return [];
    }
  }

  async add<T extends keyof DBSchema>(storeName: T, data: DBSchema[T]): Promise<DBSchema[T]> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onerror = () => {
          console.error(`Error adding to ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve(data);
      });
    } catch (error) {
      console.error(`Error in add for ${storeName}:`, error);
      throw error;
    }
  }

  async put<T extends keyof DBSchema>(storeName: T, data: DBSchema[T]): Promise<DBSchema[T]> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onerror = () => {
          console.error(`Error putting to ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve(data);
      });
    } catch (error) {
      console.error(`Error in put for ${storeName}:`, error);
      throw error;
    }
  }

  async delete<T extends keyof DBSchema>(storeName: T, id: number): Promise<boolean> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onerror = () => {
          console.error(`Error deleting from ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error(`Error in delete for ${storeName}:`, error);
      return false;
    }
  }

  async getById<T extends keyof DBSchema>(storeName: T, id: number): Promise<DBSchema[T] | undefined> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onerror = () => {
          console.error(`Error getting by id from ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve({
              ...result,
              createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
              timestamp: result.timestamp ? new Date(result.timestamp) : undefined,
            });
          } else {
            resolve(undefined);
          }
        };
      });
    } catch (error) {
      console.error(`Error in getById for ${storeName}:`, error);
      return undefined;
    }
  }

  async getByIndex<T extends keyof DBSchema>(storeName: T, indexName: string, value: any): Promise<DBSchema[T][]> {
    try {
      const store = await this.getStore(storeName);
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        request.onerror = () => {
          console.error(`Error getting by index from ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          const results = request.result.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
          }));
          resolve(results);
        };
      });
    } catch (error) {
      console.error(`Error in getByIndex for ${storeName}:`, error);
      return [];
    }
  }

  async clear<T extends keyof DBSchema>(storeName: T): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => {
          console.error(`Error clearing ${storeName}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error(`Error in clear for ${storeName}:`, error);
      throw error;
    }
  }

  async getNextId<T extends keyof DBSchema>(storeName: T): Promise<number> {
    try {
      const items = await this.getAll(storeName);
      const maxId = items.reduce((max, item) => Math.max(max, (item as any).id || 0), 0);
      return maxId + 1;
    } catch (error) {
      console.error(`Error getting next id for ${storeName}:`, error);
      return 1;
    }
  }
}

export const indexedDB = new IndexedDBStorage();