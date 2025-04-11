import mongoose from 'mongoose';
import { log } from './server-only';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Additional connection options
mongoose.set('strictQuery', false); // For deprecation warning

// MongoDB connection string with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://emilynn:IsWhjH4vC6khOfrX@soulseerreplit.4czlq8o.mongodb.net/?retryWrites=true&w=majority&appName=SoulSeerReplit';

// In-memory MongoDB server for development
let mongoMemoryServer: MongoMemoryServer | null = null;

// Create database connection
export async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      log('Connecting to MongoDB...', 'database');
      
      // For this project, we'll always use the real MongoDB connection
      // as we're migrating from PostgreSQL to MongoDB
      let uri = MONGODB_URI;
      
      if (!uri) {
        throw new Error('MONGODB_URI is not defined');
      }
      
      log(`Using MongoDB with connection URI: ${uri.substring(0, 20)}...`, 'database');
      
      await mongoose.connect(uri, {
        // Added options for better connection reliability
        serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
        heartbeatFrequencyMS: 30000, // How often to check the connection
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });
      
      // Set up connection event handlers
      mongoose.connection.on('error', (err) => {
        log(`MongoDB connection error: ${err}`, 'database');
      });
      
      mongoose.connection.on('disconnected', () => {
        log('MongoDB disconnected, attempting to reconnect...', 'database');
      });
      
      log('MongoDB connection established successfully', 'database');
    }
    return mongoose.connection;
  } catch (error) {
    log(`Error connecting to MongoDB: ${error}`, 'database');
    
    // Retry with exponential backoff (for production connections)
    if (process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
      log('Will retry connection in 5 seconds...', 'database');
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const connection = await connectToDatabase();
            resolve(connection);
          } catch (retryError) {
            reject(retryError);
          }
        }, 5000);
      });
    }
    
    throw error;
  }
}

// Define schemas for collections
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fullName: String,
  role: { type: String, enum: ['admin', 'user', 'reader'], default: 'user' },
  profileImage: String,
  bio: String,
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  stripeCustomerId: String,
  stripeConnectId: String,
  preferences: { type: Map, of: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const readingSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['video', 'voice', 'chat'], required: true },
  status: { type: String, enum: ['requested', 'accepted', 'declined', 'completed', 'cancelled'], default: 'requested' },
  notes: String,
  rating: { type: Number, min: 0, max: 5 },
  review: String,
  duration: { type: Number, default: 0 }, // in minutes
  totalAmount: { type: Number, default: 0 }, // in cents
  roomId: String,
  scheduledAt: Date,
  completedAt: Date,
  clientNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  readingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reading' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true }, // in cents
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  type: { type: String, enum: ['reading', 'gift', 'product', 'subscription'], required: true },
  stripePaymentId: String,
  readerShare: Number, // in cents (70% of amount)
  platformFee: Number, // in cents (30% of amount)
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // in cents
  imageUrl: String,
  category: { type: String, required: true },
  inventory: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const livestreamSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  scheduledAt: Date,
  startedAt: Date,
  endedAt: Date,
  thumbnailUrl: String,
  viewCount: { type: Number, default: 0 },
  roomId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  trackingNumber: String,
  stripePaymentId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Define models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Reading = mongoose.models.Reading || mongoose.model('Reading', readingSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Livestream = mongoose.models.Livestream || mongoose.model('Livestream', livestreamSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Export database helper functions

// Generic find functions
export async function findById(collection: string, id: string) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findById(id);
}

export async function findOne(collection: string, filter: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findOne(filter);
}

export async function find(collection: string, filter: object = {}, options: any = {}) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  
  let query = model.find(filter);
  
  if (options.sort) query = query.sort(options.sort);
  if (options.limit) query = query.limit(options.limit);
  if (options.skip) query = query.skip(options.skip);
  if (options.select) query = query.select(options.select);
  if (options.populate) query = query.populate(options.populate);
  
  return query.exec();
}

// Generic update functions
export async function updateById(collection: string, id: string, update: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findByIdAndUpdate(id, update, { new: true });
}

export async function updateOne(collection: string, filter: object, update: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findOneAndUpdate(filter, update, { new: true });
}

// Generic insert functions
export async function insertOne(collection: string, document: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  const newDoc = new model(document);
  return newDoc.save();
}

export async function insertMany(collection: string, documents: object[]) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.insertMany(documents);
}

// Generic delete functions
export async function deleteById(collection: string, id: string) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findByIdAndDelete(id);
}

export async function deleteOne(collection: string, filter: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.findOneAndDelete(filter);
}

export async function deleteMany(collection: string, filter: object) {
  const model = mongoose.models[collection];
  if (!model) throw new Error(`Model ${collection} not found`);
  return model.deleteMany(filter);
}

// Compatibility layer for PostgreSQL-style queries
export async function query(text: string, params?: any[]) {
  // This is a simple compatibility layer to map SQL-like queries to MongoDB
  // It's limited but helps with migration
  log('Using MongoDB compatibility layer for SQL query', 'database');
  
  // Extract collection/table name and operation from SQL text
  const sqlLower = text.toLowerCase();
  
  // For SELECT queries
  if (sqlLower.startsWith('select')) {
    const fromMatch = sqlLower.match(/from\s+(\w+)/i);
    if (!fromMatch) throw new Error('Cannot parse collection name from SQL query');
    
    const collection = fromMatch[1];
    const model = mongoose.models[collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase()];
    
    if (!model) throw new Error(`Model for collection ${collection} not found`);
    
    // Very simple WHERE handling (this is quite limited)
    const whereMatch = sqlLower.match(/where\s+(.*?)(\s+order by|\s+limit|\s*$)/i);
    const filter = whereMatch ? parseWhereClause(whereMatch[1], params) : {};
    
    return { rows: await model.find(filter).lean() };
  }
  
  // For INSERT queries (very simplified)
  if (sqlLower.startsWith('insert')) {
    const intoMatch = sqlLower.match(/into\s+(\w+)/i);
    if (!intoMatch) throw new Error('Cannot parse collection name from SQL query');
    
    const collection = intoMatch[1];
    const model = mongoose.models[collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase()];
    
    if (!model) throw new Error(`Model for collection ${collection} not found`);
    
    // We'll need the values to insert
    if (!params || params.length === 0) throw new Error('No parameters provided for INSERT query');
    
    const newDoc = new model(params[0]);
    const result = await newDoc.save();
    
    return { rows: [result.toObject()] };
  }
  
  // For UPDATE queries (very simplified)
  if (sqlLower.startsWith('update')) {
    const updateMatch = sqlLower.match(/update\s+(\w+)/i);
    if (!updateMatch) throw new Error('Cannot parse collection name from SQL query');
    
    const collection = updateMatch[1];
    const model = mongoose.models[collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase()];
    
    if (!model) throw new Error(`Model for collection ${collection} not found`);
    
    // Extract where clause for conditions
    const whereMatch = sqlLower.match(/where\s+(.*?)(\s*$)/i);
    const filter = whereMatch ? parseWhereClause(whereMatch[1], params) : {};
    
    // Extract set clause for updates
    const setMatch = sqlLower.match(/set\s+(.*?)(\s+where|\s*$)/i);
    if (!setMatch) throw new Error('Cannot parse SET clause from SQL query');
    
    const updates = parseSetClause(setMatch[1], params);
    
    const result = await model.updateMany(filter, { $set: updates });
    
    return { rows: [], rowCount: result.modifiedCount };
  }
  
  // For DELETE queries
  if (sqlLower.startsWith('delete')) {
    const fromMatch = sqlLower.match(/from\s+(\w+)/i);
    if (!fromMatch) throw new Error('Cannot parse collection name from SQL query');
    
    const collection = fromMatch[1];
    const model = mongoose.models[collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase()];
    
    if (!model) throw new Error(`Model for collection ${collection} not found`);
    
    // Extract where clause
    const whereMatch = sqlLower.match(/where\s+(.*?)(\s*$)/i);
    const filter = whereMatch ? parseWhereClause(whereMatch[1], params) : {};
    
    const result = await model.deleteMany(filter);
    
    return { rows: [], rowCount: result.deletedCount };
  }
  
  // For transaction management commands
  if (sqlLower === 'begin') {
    log('BEGIN: MongoDB uses session-based transactions - compatibility layer', 'database');
    return { rows: [] };
  }
  
  if (sqlLower === 'commit') {
    log('COMMIT: MongoDB uses session-based transactions - compatibility layer', 'database');
    return { rows: [] };
  }
  
  if (sqlLower === 'rollback') {
    log('ROLLBACK: MongoDB uses session-based transactions - compatibility layer', 'database');
    return { rows: [] };
  }
  
  throw new Error(`Unsupported SQL operation in MongoDB compatibility layer: ${text}`);
}

// Helper to parse simplified WHERE clauses
function parseWhereClause(whereClause: string, params?: any[]): object {
  const filter: any = {};
  
  // Very simplified parsing - only handles basic equality conditions
  const conditions = whereClause.split(/\s+and\s+/i);
  
  conditions.forEach((condition, index) => {
    const match = condition.match(/(\w+)\s*=\s*\$(\d+)/i);
    if (match && params) {
      const field = match[1];
      const paramIndex = parseInt(match[2]) - 1;
      if (paramIndex >= 0 && paramIndex < params.length) {
        filter[field] = params[paramIndex];
      }
    }
  });
  
  return filter;
}

// Helper to parse SET clauses in UPDATE statements
function parseSetClause(setClause: string, params?: any[]): object {
  const updates: any = {};
  
  // Very simplified parsing of SET expressions
  const assignments = setClause.split(/\s*,\s*/);
  
  assignments.forEach((assignment) => {
    const match = assignment.match(/(\w+)\s*=\s*\$(\d+)/i);
    if (match && params) {
      const field = match[1];
      const paramIndex = parseInt(match[2]) - 1;
      if (paramIndex >= 0 && paramIndex < params.length) {
        updates[field] = params[paramIndex];
      }
    }
  });
  
  return updates;
}

// Export default connection function
export default connectToDatabase;