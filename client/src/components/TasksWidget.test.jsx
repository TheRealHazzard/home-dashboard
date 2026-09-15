import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksWidget from './TasksWidget.jsx';
import { mockFetch } from '../../test/fetchMock.js';

function task(overrides = {}) {
  return {
    id: 't1', title: 'Sample', notes: '', done: false, dueDate: null,
    createdAt: 1000, updatedAt: 1000, ...overrides,
  };
}

describe('TasksWidget', () => {
  it('shows a loading state, then an empty state when nothing is on today\'s agenda', async () => {
    mockFetch({ '/api/tasks': { tasks: [] } });
    render(<TasksWidget />);
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    expect(await screen.findByText('Nothing on the list.')).toBeInTheDocument();
  });

  it('shows undated, due-today, and overdue tasks, but not future-dated ones', async () => {
    mockFetch({
      '/api/tasks': {
        tasks: [
          task({ id: 'a', title: 'Undated', dueDate: null }),
          task({ id: 'b', title: 'Overdue', dueDate: '2000-01-01' }),
          task({ id: 'c', title: 'Future', dueDate: '2999-01-01' }),
        ],
      },
    });
    render(<TasksWidget />);
    expect(await screen.findByText('Undated')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.queryByText('Future')).not.toBeInTheDocument();
  });

  it('adding a task posts it and appends it to the list', async () => {
    const fetchMock = mockFetch({
      '/api/tasks': (url, opts) =>
        opts?.method === 'POST' ? task({ id: 'new', title: 'Water the plants' }) : { tasks: [] },
    });
    render(<TasksWidget />);
    await screen.findByText('Nothing on the list.');

    await userEvent.type(screen.getByPlaceholderText('Add a task…'), 'Water the plants');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Water the plants')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a task…').value).toBe('');
    expect(fetchMock.calls.some(c => c.url.includes('/api/tasks') && c.opts?.method === 'POST')).toBe(true);
  });

  it('checking a task off crosses it out and sorts it below unfinished ones', async () => {
    mockFetch({
      '/api/tasks/a': task({ id: 'a', title: 'Done me', done: true }),
      '/api/tasks': {
        tasks: [
          task({ id: 'a', title: 'Done me', createdAt: 1 }),
          task({ id: 'b', title: 'Still open', createdAt: 2 }),
        ],
      },
    });
    render(<TasksWidget />);
    await screen.findByText('Done me');

    const rows = () => screen.getAllByRole('listitem');
    expect(rows()[0]).toHaveTextContent('Done me'); // unfinished, created first, sorts first

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await vi.waitFor(() => expect(rows()[0]).toHaveTextContent('Still open'));
    expect(rows()[1]).toHaveClass('done');
  });

  it('the remove button deletes a task from the list', async () => {
    mockFetch({ '/api/tasks': { tasks: [task({ id: 'a', title: 'Gone soon' })] } });
    render(<TasksWidget />);
    await screen.findByText('Gone soon');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Gone soon' }));
    expect(screen.queryByText('Gone soon')).not.toBeInTheDocument();
  });
});
