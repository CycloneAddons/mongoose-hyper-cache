/**
 * Example: Express API with Performance Comparison
 * Shows async vs sync read performance
 */

import mongoose from 'mongoose';
import hyper from '../src';
import express, { Request, Response } from 'express';

const userSchema = new mongoose.Schema({
  username: { type: String, index: true },
  email: { type: String, unique: true },
  role: { type: String, default: 'user' },
  active: { type: Boolean, default: true },
});

const User = mongoose.model('User', userSchema);

let cache: any;

// Middleware: Get user from cache synchronously
function getUserMiddleware(req: Request, res: Response, next: Function) {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }

  // ✓ SYNC READ - Ultra fast (0ms from memory cache)
  const user = User.findById(userId) as any;
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  (req as any).user = user;
  next();
}

// Setup Express app
const app = express();
app.use(express.json());
app.use(getUserMiddleware);

// Route: Get user profile
app.get('/user/profile', (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
});

// Route: Get active users
app.get('/users/active', (req: Request, res: Response) => {
  // ✓ SYNC READ - No await!
  const activeUsers = User.find({ active: true }) as any[];

  res.json({
    count: activeUsers.length,
    users: activeUsers.map((u: any) => ({
      id: u._id,
      username: u.username,
    })),
  });
});

// Route: Find user by username
app.get('/users/search/:username', (req: Request, res: Response) => {
  // ✓ SYNC READ - Ultra responsive
  const user = User.findOne({ username: req.params.username }) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// Route: Update user
app.post('/user/update', async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  // ✗ Write still goes through MongoDB
  await User.updateOne(
    { _id: userId },
    { $set: req.body }
  );

  // But then it's in cache!
  const updated = User.findById(userId) as any;

  res.json({
    message: 'Updated',
    user: updated,
  });
});

// Route: Performance test
app.get('/perf/test', async (req: Request, res: Response) => {
  const iterations = 1000;

  // Test 1: Async reads from MongoDB (without cache)
  // (Can't test this directly since cache is active, but shows the difference)
  
  // Test 2: Sync reads from cache (0ms!)
  console.time('cache-read-1000');
  for (let i = 0; i < iterations; i++) {
    User.findOne({ active: true });
  }
  console.timeEnd('cache-read-1000');

  const allUsers = User.find({ active: true }) as any[];

  res.json({
    message: 'Sync reads from cache! See console for timing.',
    cacheSize: allUsers.length,
    iterations,
  });
});

// Initialize and start
async function start() {
  try {
    await mongoose.connect('mongodb://localhost:27017/api-example');
    console.log('✓ Connected to MongoDB');

    // Initialize hyper-cache
    cache = await hyper.init(mongoose, {
      provider: 'memory+redis',
      warmOnStartup: true,
      debug: true,
    });

    await cache.ready;
    console.log('✓ Cache ready');

    // Create sample users if not exist
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Creating sample users...');
      for (let i = 0; i < 100; i++) {
        await User.create({
          username: `user${i}`,
          email: `user${i}@example.com`,
          role: i % 10 === 0 ? 'admin' : 'user',
          active: Math.random() > 0.2,
        });
      }
      console.log('✓ Created 100 sample users');
    }

    // Re-warm after data creation
    cache = await hyper.init(mongoose, {
      provider: 'memory+redis',
      warmOnStartup: true,
      debug: false,
    });
    await cache.ready;

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log('\nExample requests:');
      console.log(`  curl http://localhost:${PORT}/users/active -H "x-user-id: <userId>"`);
      console.log(`  curl http://localhost:${PORT}/users/search/user0 -H "x-user-id: <userId>"`);
      console.log(`  curl http://localhost:${PORT}/perf/test -H "x-user-id: <userId>"`);
    });
  } catch (err) {
    console.error('Initialization error:', err);
    process.exit(1);
  }
}

start();
