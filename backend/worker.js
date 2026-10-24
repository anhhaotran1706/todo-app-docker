const os = require('os');
const Redis = require('ioredis');
const { connectWithRetry } = require('./db');
const { Notification } = require('./models');
const { sendMail } = require('./mailer');

const QUEUE = process.env.QUEUE_NAME || 'todo_events';
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handle(event) {
  if (event.type === 'user.registered') {
    await sendMail({
      to: event.email,
      subject: 'Verify your e-mail',
      html: `<p>Welcome to the Todo app!</p><p><a href="${event.verifyUrl}">Click here to verify your e-mail</a> (valid for 24 hours).</p>`,
    });
    console.log(`[worker] verification e-mail sent to ${event.email}`);
    return;
  }
  await sleep(2000); // simulated slow e-mail
  const message =
    event.type === 'todo.created'
      ? `Reminder e-mail sent for new task "${event.title}"`
      : `Congratulation e-mail sent for completed task "${event.title}"`;
  await Notification.create({ user: event.user, todoId: event.todoId, type: event.type, message, processedBy: os.hostname() });
  console.log(`[worker] ${message}`);
}

(async () => {
  await connectWithRetry();
  console.log(`[worker] ${os.hostname()} waiting for events on "${QUEUE}"`);
  while (true) {
    const result = await redis.brpop(QUEUE, 0);
    const event = JSON.parse(result[1]);
    try {
      await handle(event);
    } catch (err) {
      const attempts = (event.attempts || 0) + 1;
      console.error(`[worker] failed (attempt ${attempts}):`, err.message);
      if (attempts < 3) {
        await sleep(5000);
        await redis.lpush(QUEUE, JSON.stringify({ ...event, attempts })); // retry
      }
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});