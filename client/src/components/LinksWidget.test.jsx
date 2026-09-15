import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinksWidget from './LinksWidget.jsx';
import { mockFetch } from '../../test/fetchMock.js';

function link(overrides = {}) {
  return { id: 'l1', label: 'Router', url: 'http://192.168.1.1', icon: '🔗', order: 0, createdAt: 1000, ...overrides };
}

describe('LinksWidget', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a loading state, then an empty state with no links', async () => {
    mockFetch({ '/api/links': { links: [] } });
    render(<LinksWidget />);
    expect(screen.getByText('Loading links…')).toBeInTheDocument();
    expect(await screen.findByText('No links yet.')).toBeInTheDocument();
  });

  it('renders a tile per link, and clicking it opens the url in a new tab', async () => {
    mockFetch({ '/api/links': { links: [link()] } });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    render(<LinksWidget />);
    await userEvent.click(await screen.findByText('Router'));
    expect(openSpy).toHaveBeenCalledWith('http://192.168.1.1', '_blank', 'noopener,noreferrer');
  });

  it('adding a link posts it, appends a tile, and clears the form', async () => {
    mockFetch({
      '/api/links': (url, opts) =>
        opts?.method === 'POST' ? link({ id: 'new', label: 'NAS', url: 'http://nas.local' }) : { links: [] },
    });
    render(<LinksWidget />);
    await screen.findByText('No links yet.');

    await userEvent.type(screen.getByPlaceholderText('Label'), 'NAS');
    await userEvent.type(screen.getByPlaceholderText('https://…'), 'http://nas.local');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('NAS')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Label').value).toBe('');
    expect(screen.getByPlaceholderText('https://…').value).toBe('');
  });

  it('Add is disabled until both label and url are filled in', async () => {
    mockFetch({ '/api/links': { links: [] } });
    render(<LinksWidget />);
    await screen.findByText('No links yet.');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Label'), 'NAS');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('https://…'), 'http://nas.local');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('the remove button deletes a tile', async () => {
    mockFetch({ '/api/links': { links: [link({ label: 'Gone' })] } });
    render(<LinksWidget />);
    await screen.findByText('Gone');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Gone' }));
    expect(screen.queryByText('Gone')).not.toBeInTheDocument();
  });
});
