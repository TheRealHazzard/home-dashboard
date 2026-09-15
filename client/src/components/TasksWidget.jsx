import { useState } from 'react';
import { useTasks } from '../hooks/useTasks.js';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "Today" means undated (no due date = anytime/general), due today, or
// overdue — everything a person would actually want to see when they
// glance at the kiosk this morning. Completed tasks stay visible for the
// rest of the day (sorted to the bottom, crossed out) rather than
// vanishing the instant they're checked off — the same pattern most
// to-do apps use, so checking something off still feels like real
// visible progress.
function todaysAgenda(tasks) {
  const today = todayISO();
  return tasks
    .filter(t => t.dueDate == null || t.dueDate <= today)
    .sort((a, b) => (a.done === b.done ? a.createdAt - b.createdAt : a.done ? 1 : -1));
}

export default function TasksWidget() {
  const { tasks, addTask, toggleDone, removeTask } = useTasks();
  const [draft, setDraft] = useState('');

  const submit = e => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    addTask(title);
    setDraft('');
  };

  const agenda = tasks ? todaysAgenda(tasks) : [];

  return (
    <section className="widget widget-tasks">
      <h2 className="widget-title">Today</h2>
      {tasks === null ? (
        <div className="widget-loading">Loading tasks…</div>
      ) : agenda.length === 0 ? (
        <div className="widget-empty">Nothing on the list.</div>
      ) : (
        <ul className="task-list">
          {agenda.map(task => (
            <li key={task.id} className={'task-row' + (task.done ? ' done' : '')}>
              <label className="task-check">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleDone(task.id, !task.done)}
                />
                <span>{task.title}</span>
              </label>
              <button type="button" className="task-remove" aria-label={`Remove ${task.title}`} onClick={() => removeTask(task.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="task-add" onSubmit={submit}>
        <input
          type="text"
          placeholder="Add a task…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <button type="submit" disabled={!draft.trim()}>Add</button>
      </form>
    </section>
  );
}
