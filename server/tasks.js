'use strict';

const path = require('path');
const crypto = require('crypto');
const { readJson, writeJsonSafe } = require('./jsonStore');
const { HttpError } = require('./httpError');

const DATA_PATH = path.join(__dirname, '..', 'data', 'tasks.json');

function load() {
  return readJson(DATA_PATH, { tasks: [] }).tasks;
}

function save(tasks) {
  writeJsonSafe(DATA_PATH, { tasks });
}

function listTasks() {
  return load();
}

function createTask({ title, notes = '', dueDate = null }) {
  if (!title || !title.trim()) throw new HttpError(400, 'title is required');
  const now = Date.now();
  const task = {
    id: crypto.randomBytes(6).toString('hex'),
    title: title.trim(),
    notes,
    done: false,
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
  const tasks = load();
  tasks.push(task);
  save(tasks);
  return task;
}

function updateTask(id, patch) {
  const tasks = load();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  const updated = { ...tasks[index], ...patch, id, updatedAt: Date.now() };
  tasks[index] = updated;
  save(tasks);
  return updated;
}

function removeTask(id) {
  const tasks = load();
  const next = tasks.filter(t => t.id !== id);
  if (next.length === tasks.length) return false;
  save(next);
  return true;
}

module.exports = { listTasks, createTask, updateTask, removeTask };
