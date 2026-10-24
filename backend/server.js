const os = require('os');
const express = require('express');
const Redis = require('ioredis');
const { connectWithRetry } = require('./db');
const { Todo, Notification } = require('./models');
const { createAuthRouter, requireAuth, wrap } = require('./auth');

const PORT = process.env.PORT || 3000;
const QUEUE = process.env.QUEUE_NAME || 'todo_events';
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Served-By', os.hostname());
  next();
});

// Publish an event to the Redis queue; the worker processes it asynchronously.
async function publish(type, payload) {
  await redis.lpush(QUEUE, JSON.stringify({ type, ...payload }));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', instance: os.hostname() }));
app.use('/api/auth', createAuthRouter(publish));
app.use('/api/todos', requireAuth);
app.use('/api/notifications', requireAuth);

app.get('/api/todos', wrap(async (req, res) => {
  res.json(await Todo.find({ user: req.user.sub }).sort({ createdAt: -1 }));
}));

app.post('/api/todos', wrap(async (req, res) => {
  const { title, dueDate } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const todo = await Todo.create({ user: req.user.sub, title, dueDate: dueDate || null });
  await publish('todo.created', { user: req.user.sub, todoId: todo._id, title: todo.title });
  res.status(201).json(todo);
}));

app.put('/api/todos/:id', wrap(async (req, res) => {
  const todo = await Todo.findOne({ _id: req.params.id, user: req.user.sub });
  if (!todo) return res.status(404).json({ error: 'Not found' });
  const { title, done, dueDate } = req.body;
  if (title !== undefined) todo.title = title;
  if (done !== undefined) todo.done = done;
  if (dueDate !== undefined) todo.dueDate = dueDate || null;
  await todo.save();
  if (done === true) await publish('todo.completed', { user: req.user.sub, todoId: todo._id, title: todo.title });
  res.json(todo);
}));

app.delete('/api/todos/:id', wrap(async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.sub });
  if (!todo) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}));

app.get('/api/notifications', wrap(async (req, res) => {
  res.json(await Notification.find({ user: req.user.sub }).sort({ createdAt: -1 }).limit(10));
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'CastError' ? 400 : 500).json({ error: 'Request failed' });
});

(async () => {
  await connectWithRetry();
  app.listen(PORT, () => console.log(`[api] ${os.hostname()} listening on port ${PORT}`));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});