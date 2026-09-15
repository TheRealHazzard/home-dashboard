import { useCallback, useEffect, useState } from 'react';
import { get, post, patch, del } from '../lib/api.js';

/** Owns the task list — fetches once on mount, and every mutation folds
    the server's response back into local state immediately rather than
    waiting on a refetch (there's no other viewer to stay in sync with on
    a single kiosk, so this is just about feeling instant). */
export function useTasks() {
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    get('/api/tasks').then(data => setTasks(data.tasks));
  }, []);

  const addTask = useCallback(title => {
    return post('/api/tasks', { title }).then(task => {
      setTasks(prev => [...(prev || []), task]);
      return task;
    });
  }, []);

  const toggleDone = useCallback((id, done) => {
    return patch(`/api/tasks/${id}`, { done }).then(updated => {
      setTasks(prev => (prev || []).map(t => (t.id === id ? updated : t)));
      return updated;
    });
  }, []);

  const removeTask = useCallback(id => {
    return del(`/api/tasks/${id}`).then(() => {
      setTasks(prev => (prev || []).filter(t => t.id !== id));
    });
  }, []);

  return { tasks, addTask, toggleDone, removeTask };
}
