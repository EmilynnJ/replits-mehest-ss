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
      
      // Try to use the real MongoDB connection first, but fall back to in-memory if it fails
      let uri;
      
      try {
        // First try real MongoDB connection
        uri = MONGODB_URI;
        if (!uri) {
          throw new Error('MONGODB_URI is not defined');
        }
        
        log(`Attempting MongoDB connection with URI: ${uri.substring(0, 20)}...`, 'database');
        
        // Try connecting with a short timeout to fail fast
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000, // Short timeout to fail fast
        });
        
        log('MongoDB Atlas connection successful', 'database');
      } catch (error) {
        log(`MongoDB Atlas connection failed: ${error}. Falling back to in-memory MongoDB`, 'database');
        
        // Fall back to in-memory MongoDB
        if (!mongoMemoryServer) {
          log('Starting MongoDB Memory Server...', 'database');
          mongoMemoryServer = await MongoMemoryServer.create();
          log('MongoDB Memory Server started successfully', 'database');
        }
        
        uri = mongoMemoryServer.getUri();
        log(`Using in-memory MongoDB at ${uri}`, 'database');
        
        // Set flag to create sample data after connection
        process.env.MONGODB_SEED_SAMPLE_DATA = 'true';
      }
      
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
      
      // Seed sample data in in-memory database if needed
      if (process.env.MONGODB_SEED_SAMPLE_DATA === 'true') {
        await seedSampleData();
      }
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

// Sample data seeding for development
async function seedSampleData() {
  try {
    log('Seeding sample data for development...', 'database');
    
    // Check if we already have data
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      log('Data already exists, skipping seed', 'database');
      return;
    }
    
    // Create users: clients, readers, and admin
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@soulseer.app',
      password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'admin123'
      fullName: 'Admin User',
      role: 'admin',
      profileImage: '/images/users/admin.jpg',
      bio: 'System administrator',
      isVerified: true,
      isOnline: true
    });
    
    // Create reader users
    const readers = await User.create([
      {
        username: 'mysticmaya',
        email: 'maya@soulseer.app',
        password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'password123'
        fullName: 'Maya Johnson',
        role: 'reader',
        profileImage: '/images/users/maya.jpg',
        bio: 'Tarot specialist with 10 years of experience in spiritual guidance.',
        isVerified: true,
        isOnline: true
      },
      {
        username: 'cosmicalex',
        email: 'alex@soulseer.app',
        password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'password123'
        fullName: 'Alex Chen',
        role: 'reader',
        profileImage: '/images/users/alex.jpg',
        bio: 'Astrologer and energy healer specializing in life path guidance.',
        isVerified: true,
        isOnline: true
      },
      {
        username: 'intuitiveisabel',
        email: 'isabel@soulseer.app',
        password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'password123'
        fullName: 'Isabel Rodriguez',
        role: 'reader',
        profileImage: '/images/users/isabel.jpg',
        bio: 'Medium with a gift for connecting with loved ones who have passed.',
        isVerified: true,
        isOnline: false
      }
    ]);
    
    // Create client users
    const clients = await User.create([
      {
        username: 'client1',
        email: 'client1@example.com',
        password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'password123'
        fullName: 'Jamie Smith',
        role: 'user',
        profileImage: null,
        bio: null,
        isVerified: true,
        isOnline: false
      },
      {
        username: 'client2',
        email: 'client2@example.com',
        password: '$2b$10$K4nTjbGj9Y0xP0HIEwdXOOeDvgOXILf6j7vkdYfvZ3lM9i1U0Acja', // 'password123'
        fullName: 'Taylor Brown',
        role: 'user',
        profileImage: null,
        bio: null,
        isVerified: true,
        isOnline: false
      }
    ]);
    
    // Create products
    const products = await Product.create([
      {
        name: 'Rose Quartz Crystal',
        description: 'A beautiful rose quartz crystal for love and healing energy.',
        price: 2499, // $24.99
        imageUrl: '/images/products/rose-quartz.jpg',
        category: 'Crystals',
        inventory: 15,
        isFeatured: true,
        sellerId: readers[0]._id
      },
      {
        name: 'Tarot Card Deck',
        description: 'Premium tarot card deck with guidebook for beginners and experts.',
        price: 3999, // $39.99
        imageUrl: '/images/products/tarot-deck.jpg',
        category: 'Divination',
        inventory: 10,
        isFeatured: true,
        sellerId: readers[1]._id
      },
      {
        name: 'Meditation Candle Set',
        description: 'Set of 3 handcrafted meditation candles with essential oils.',
        price: 2899, // $28.99
        imageUrl: '/images/products/candles.jpg',
        category: 'Meditation',
        inventory: 20,
        isFeatured: true,
        sellerId: readers[2]._id
      }
    ]);
    
    // Create livestreams
    const livestreams = await Livestream.create([
      {
        hostId: readers[0]._id,
        title: 'Weekly Tarot Reading',
        description: 'Join Maya for this week\'s tarot guidance session.',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        thumbnailUrl: '/images/livestreams/tarot-session.jpg',
        viewCount: 0,
        roomId: 'room_' + Math.random().toString(36).substring(2, 15)
      },
      {
        hostId: readers[1]._id,
        title: 'Full Moon Meditation',
        description: 'Harness the energy of the full moon with Alex.',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 172800000), // Day after tomorrow
        thumbnailUrl: '/images/livestreams/full-moon.jpg',
        viewCount: 0,
        roomId: 'room_' + Math.random().toString(36).substring(2, 15)
      },
      {
        hostId: readers[2]._id,
        title: 'Q&A: Connecting with Spirit Guides',
        description: 'Isabel answers your questions about spirit guides and communication.',
        status: 'live',
        startedAt: new Date(),
        thumbnailUrl: '/images/livestreams/spirit-guides.jpg',
        viewCount: 12,
        roomId: 'room_' + Math.random().toString(36).substring(2, 15)
      }
    ]);
    
    // Create readings
    const readings = await Reading.create([
      {
        clientId: clients[0]._id,
        readerId: readers[0]._id,
        type: 'video',
        status: 'completed',
        notes: 'Focus on career questions',
        rating: 5,
        review: 'Amazing reading! Maya provided clear guidance for my career path.',
        duration: 30,
        totalAmount: 4500, // $45.00
        roomId: 'session_' + Math.random().toString(36).substring(2, 15),
        scheduledAt: new Date(Date.now() - 604800000), // 1 week ago
        completedAt: new Date(Date.now() - 604800000 + 1800000),
        clientNotes: 'Looking for guidance on a potential career change.'
      },
      {
        clientId: clients[1]._id,
        readerId: readers[1]._id,
        type: 'chat',
        status: 'scheduled',
        notes: 'Relationship reading',
        rating: null,
        review: null,
        duration: 0,
        totalAmount: 0,
        roomId: 'session_' + Math.random().toString(36).substring(2, 15),
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        clientNotes: 'Need advice on my current relationship.'
      }
    ]);
    
    log('Sample data seeded successfully!', 'database');
  } catch (error) {
    log(`Error seeding sample data: ${error}`, 'database');
  }
}

// Define schemas for collections
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fullName: String,
  role: { type: String, enum: ['admin', 'user', 'reader', 'client'], default: 'user' },
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
  status: { type: String, enum: ['requested', 'accepted', 'declined', 'completed', 'cancelled', 'scheduled', 'in_progress', 'waiting_payment', 'payment_completed'], default: 'requested' },
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
  status: { type: String, enum: ['scheduled', 'created', 'live', 'ended', 'idle'], default: 'scheduled' },
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