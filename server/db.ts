import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// CRITICAL: fail fast, don't hang requests if connection drops
mongoose.set('bufferCommands', false);

let isConnected = false;
let memoryServerInstance: any = null;

export async function connectDB(): Promise<string> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return 'connected';
  }

  const customUri = process.env.MONGODB_URI?.trim();

  if (customUri) {
    try {
      console.log('Connecting to provided MongoDB URI...');
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('Connected to external MongoDB successfully.');
      return customUri;
    } catch (err: any) {
      console.warn(`External MongoDB connection failed (${err.message}). Falling back to embedded MongoMemoryServer for reliable offline/demo mode...`);
    }
  }

  // Fallback or default embedded MongoDB for guaranteed zero-config demo experience
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    if (!memoryServerInstance) {
      memoryServerInstance = await MongoMemoryServer.create({
        instance: { dbName: 'stockpilot' },
      });
    }
    const memUri = memoryServerInstance.getUri();
    console.log(`Starting StockPilot with embedded MongoDB instance at: ${memUri}`);
    await mongoose.connect(memUri);
    isConnected = true;
    console.log('Connected to embedded MongoDB database.');
    return memUri;
  } catch (err: any) {
    console.error('Failed to initialize MongoDB connection:', err);
    throw err;
  }
}

export function getDBStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    dbName: mongoose.connection.name || 'stockpilot',
    host: mongoose.connection.host || 'localhost',
    isEmbedded: Boolean(memoryServerInstance),
  };
}
