# Quick Start Guide

## 5-Minute Setup

### 1. Install

```bash
npm install mongoose-hyper-cache
```

### 2. Connect & Initialize

```typescript
import mongoose from 'mongoose';
import hyper from 'mongoose-hyper-cache';

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/mydb');

// Initialize cache
const cache = await hyper.init(mongoose, {
  provider: 'memory+redis',      // or 'memory' or 'redis'
  warmOnStartup: true,            // Preload all data
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

// Wait for warm startup
await cache.ready;
```

### 3. Use Mongoose Normally

```typescript
// Async reads (from cache)
const user = await User.findById(userId);
const users = await User.find({ age: { $gte: 18 } });

// Or use synchronous reads (NO await!)
const user = User.findByIdSync(userId);
const users = User.findSync({ age: { $gte: 18 } });

// Writes auto-sync to MongoDB + cache
await User.updateOne({ _id: userId }, { status: 'active' });
await User.create({ username: 'john', email: 'john@example.com' });
await User.deleteOne({ _id: userId });
```

Done! ✓ 

## Common Configurations

### Single Server (Development)
```typescript
const cache = await hyper.init(mongoose, {
  provider: 'memory',
  warmOnStartup: true,
  debug: true,  // See cache hits/misses
});
```

### Multi-Server (Production)
```typescript
const cache = await hyper.init(mongoose, {
  provider: 'memory+redis',
  warmOnStartup: true,
  watch: true,  // Sync changes across servers
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
});
```

### Large Collections
```typescript
const cache = await hyper.init(mongoose, {
  provider: 'memory+redis',
  warmOnStartup: true,
  warmCollections: ['users', 'products'],  // Only warm these
  maxWarmDocuments: 5000,                  // Cap per collection
});
```

## API Reference

### Async Reads (Always Available)
```typescript
await Model.find(filter)           // Multiple documents
await Model.findOne(filter)        // Single document
await Model.findById(id)           // By ID
await Model.countDocuments(filter) // Count
await Model.exists(filter)         // Check existence
```

### Synchronous Reads (After Warm)
```typescript
Model.findSync(filter)     // ✓ No await!
Model.findOneSync(filter)  // ✓ No await!
Model.findByIdSync(id)     // ✓ No await!
```

### Writes (Auto-Synced)
```typescript
await Model.create(data)
await Model.updateOne(filter, update)
await Model.updateMany(filter, update)
await Model.deleteOne(filter)
await Model.deleteMany(filter)
await Model.findByIdAndUpdate(id, update)
await Model.findByIdAndDelete(id)
```

## Query Operators Supported

```typescript
// Basic
{ field: value }           // Equality
{ field: { $eq: value } }  // Explicit equality

// Comparison
{ field: { $gt: 18 } }     // Greater than
{ field: { $gte: 18 } }    // Greater or equal
{ field: { $lt: 65 } }     // Less than
{ field: { $lte: 65 } }    // Less or equal
{ field: { $ne: value } }  // Not equal

// Membership
{ field: { $in: [1, 2, 3] } }   // In array
{ field: { $nin: [1, 2, 3] } }  // Not in array

// Logical
{ $and: [cond1, cond2] }   // AND multiple conditions
{ $or: [cond1, cond2] }    // OR multiple conditions
{ $nor: [cond1, cond2] }   // NOR multiple conditions

// Advanced
{ field: { $exists: true } }      // Field exists
{ field: { $regex: 'pattern' } }  // Regex match
{ field: { $type: 'string' } }    // By type
{ field: { $size: 5 } }           // Array size
{ field: { $all: [1, 2] } }       // Array contains all
```

## Cleanup

```typescript
// Clear cache
await cache.clear();

// Shutdown
await cache.destroy();
```

## Monitoring

```typescript
const stats = cache.stats();
console.log(stats);
// {
//   provider: 'memory+redis',
//   providerStats: {
//     memory: { size: 5000, max: 100000 },
//     redis: 'connected'
//   },
//   changeStreamWatcher: { User: true, Post: false }
// }
```

## Performance Tips

1. **Use synchronous reads in hot paths**
   ```typescript
   // ✓ Good - < 1ms
   const user = User.findByIdSync(id);
   
   // ❌ Avoid - ~50ms without cache
   const user = await User.findById(id);
   ```

2. **Enable indexes in schema**
   ```typescript
   const userSchema = new Schema({
     email: { type: String, unique: true },    // Indexed
     username: { type: String, index: true },  // Indexed
     age: Number,                               // Not indexed
   });
   ```

3. **Use selective warming for large datasets**
   ```typescript
   warmCollections: ['users', 'products'],
   maxWarmDocuments: 5000,
   ```

4. **Monitor memory usage**
   ```typescript
   const stats = cache.stats();
   console.log('Memory:', stats.providerStats.memory);
   ```

## Troubleshooting

### "findByIdSync returns undefined"
- Data not warmed yet: `await cache.ready`
- Document doesn't exist: Check MongoDB
- Using wrong provider: Sync only works with memory provider

### "Redis connection failed"
- Redis not running: Start Redis server
- Wrong host/port: Check config
- Falls back to memory automatically if using hybrid

### "Stale data across servers"
- Enable change streams: `watch: true`
- Check MongoDB change stream support (4.0+)
- Verify write operations are synchronous

### "Memory usage too high"
- Reduce `maxWarmDocuments`
- Use selective warming: `warmCollections`
- Use Redis provider instead

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for deep dive
- Check [examples/](./examples/) for more use cases
- Review [README.md](./README.md) for full documentation
