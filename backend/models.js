const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifyToken: { type: String, index: true },
    verifyExpires: { type: Date },
  },
  { timestamps: true }
);

const todoSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    todoId: { type: Schema.Types.ObjectId, ref: 'Todo' },
    type: { type: String, required: true },
    message: { type: String, required: true },
    processedBy: { type: String },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model('User', userSchema),
  Todo: mongoose.model('Todo', todoSchema),
  Notification: mongoose.model('Notification', notificationSchema),
};