
import { Client } from 'pg';

interface Message {
  id: number;
  text: string;
  timestamp: string;
  sender: string;
}

class PostgresDB {
  private client: Client | null = null;

  async connect() {
    if (!this.client) {
      this.client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      await this.client.connect();
      await this.initTables();
    }
    return this.client;
  }

  async initTables() {
    if (!this.client) return;
    
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sender VARCHAR(50) NOT NULL
      );
    `;
    
    await this.client.query(createMessagesTable);
  }

  async getMessages(): Promise<Message[]> {
    const client = await this.connect();
    const result = await client.query('SELECT * FROM messages ORDER BY timestamp ASC');
    return result.rows.map(row => ({
      id: row.id,
      text: row.text,
      timestamp: row.timestamp,
      sender: row.sender
    }));
  }

  async createMessage(text: string, sender: string): Promise<Message> {
    const client = await this.connect();
    const result = await client.query(
      'INSERT INTO messages (text, sender) VALUES ($1, $2) RETURNING *',
      [text, sender]
    );
    return {
      id: result.rows[0].id,
      text: result.rows[0].text,
      timestamp: result.rows[0].timestamp,
      sender: result.rows[0].sender
    };
  }

  async deleteMessage(id: number): Promise<void> {
    const client = await this.connect();
    await client.query('DELETE FROM messages WHERE id = $1', [id]);
  }

  async close() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}

export const postgresDB = new PostgresDB();
