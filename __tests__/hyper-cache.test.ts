/**
 * Tests for mongoose-hyper-cache
 */

import mongoose from 'mongoose';
import hyper from '../src/index';

describe('mongoose-hyper-cache', () => {
  let cache: any;
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test-hyper-cache';

  // Setup schema
  const userSchema = new mongoose.Schema({
    username: { type: String, index: true },
    email: { type: String, unique: true },
    age: Number,
  });

  let User: any;

  beforeAll(async () => {
    await mongoose.connect(mongoUri);
    User = mongoose.model('User', userSchema);
  });

  afterAll(async () => {
    if (cache) {
      await cache.destroy();
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear data
    await User.deleteMany({});
    
    if (cache) {
      await cache.clear();
    }
  });

  describe('Memory Provider', () => {
    beforeEach(async () => {
      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: false,
        debug: false,
      });
      await cache.ready;
    });

    it('should cache documents after creation', async () => {
      const doc = await User.create({
        username: 'john',
        email: 'john@example.com',
        age: 30,
      });

      // Find through cache (synchronous)
      const found = User.findById(doc._id);
      expect(found).toEqual(expect.objectContaining({
        username: 'john',
        email: 'john@example.com',
      }));
    });

    it('should query from cache', async () => {
      await User.create({ username: 'alice', email: 'alice@example.com', age: 25 });
      await User.create({ username: 'bob', email: 'bob@example.com', age: 35 });

      const users = User.find({ age: { $gte: 30 } });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('bob');
    });

    it('should support synchronous reads', async () => {
      await User.create({ username: 'charlie', email: 'charlie@example.com', age: 28 });

      // Sync read
      const user = User.findOne({ username: 'charlie' });
      expect(user).toEqual(expect.objectContaining({
        username: 'charlie',
      }));
    });

    it('should sync updates to cache', async () => {
      const doc = await User.create({
        username: 'dave',
        email: 'dave@example.com',
        age: 40,
      });

      await User.updateOne({ _id: doc._id }, { age: 41 });

      const updated = User.findById(doc._id);
      expect(updated?.age).toBe(41);
    });

    it('should sync deletes to cache', async () => {
      const doc = await User.create({
        username: 'eve',
        email: 'eve@example.com',
        age: 32,
      });

      await User.deleteOne({ _id: doc._id });

      const found = User.findById(doc._id);
      expect(found).toBeNull();
    });
  });

  describe('Warm Startup', () => {
    beforeEach(async () => {
      // Create test data
      await User.create({ username: 'user1', email: 'user1@example.com', age: 20 });
      await User.create({ username: 'user2', email: 'user2@example.com', age: 30 });
      await User.create({ username: 'user3', email: 'user3@example.com', age: 40 });
    });

    it('should warm all collections on startup', async () => {
      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: true,
        debug: false,
      });
      await cache.ready;

      // Data should be in cache (synchronous)
      const users = User.find({});
      expect(users).toHaveLength(3);
    });

    it('should respect warmCollections option', async () => {
      // Create another model
      const postSchema = new mongoose.Schema({
        title: String,
      });
      const Post = mongoose.model('Post', postSchema);
      await Post.create({ title: 'Post 1' });

      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: true,
        warmCollections: ['User'], // Only warm User
        debug: false,
      });
      await cache.ready;

      const users = User.findSync({});
      expect(users.length).toBeGreaterThan(0);
    });

    it('should respect maxWarmDocuments option', async () => {
      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: true,
        maxWarmDocuments: 2, // Only warm 2
        debug: false,
      });
      await cache.ready;

      const users = User.find({});
      expect(users.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Query Operators', () => {
    beforeEach(async () => {
      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: false,
      });
      await cache.ready;

      // Create test data
      await User.create({ username: 'alice', email: 'alice@example.com', age: 25 });
      await User.create({ username: 'bob', email: 'bob@example.com', age: 35 });
      await User.create({ username: 'charlie', email: 'charlie@example.com', age: 45 });
    });

    it('should support $gt operator', async () => {
      const users = User.find({ age: { $gt: 30 } });
      expect(users).toHaveLength(2);
    });

    it('should support $lt operator', async () => {
      const users = User.find({ age: { $lt: 40 } });
      expect(users).toHaveLength(2);
    });

    it('should support $in operator', async () => {
      const users = User.find({ age: { $in: [25, 45] } });
      expect(users).toHaveLength(2);
    });

    it('should support $or operator', async () => {
      const users = User.find({
        $or: [
          { age: 25 },
          { age: 45 },
        ],
      });
      expect(users).toHaveLength(2);
    });

    it('should support $and operator', async () => {
      const users = User.find({
        $and: [
          { age: { $gte: 30 } },
          { age: { $lte: 40 } },
        ],
      });
      expect(users).toHaveLength(1);
    });

    it('should support $ne operator', async () => {
      const users = User.find({ age: { $ne: 35 } });
      expect(users).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      cache = await hyper.init(mongoose, {
        provider: 'memory',
        warmOnStartup: false,
      });
      await cache.ready;

      // Create 100 documents
      for (let i = 0; i < 100; i++) {
        await User.create({
          username: `user${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
        });
      }
    });

    it('sync reads should be fast', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        User.find({ age: 30 });
      }
      const elapsed = performance.now() - start;

      // Should be very fast - < 100ms for 1000 iterations (0ms per read)
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle large document sets', async () => {
      const allUsers = User.find({});
      expect(allUsers).toHaveLength(100);
    });
  });
});
