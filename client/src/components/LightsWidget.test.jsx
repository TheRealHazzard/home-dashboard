import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LightsWidget from './LightsWidget.jsx';
import { mockFetch } from '../../test/fetchMock.js';

function device(overrides = {}) {
  return {
    id: 'hue:1', name: 'Living Room Lamp', vendor: 'hue',
    capabilities: ['power', 'brightness'],
    state: { online: true, on: true, brightness: 80 },
    ...overrides,
  };
}

describe('LightsWidget', () => {
  it('shows a loading state, then "no lights paired" once online with an empty list', async () => {
    mockFetch({ '/api/lights/devices': { offline: false, devices: [] } });
    render(<LightsWidget />);
    expect(screen.getByText('Loading lights…')).toBeInTheDocument();
    expect(await screen.findByText('No lights paired yet.')).toBeInTheDocument();
  });

  it('shows the unreachable message when offline with no cached devices', async () => {
    mockFetch({ '/api/lights/devices': { offline: true, devices: [] } });
    render(<LightsWidget />);
    expect(await screen.findByText("smart-home-dashboard isn't reachable.")).toBeInTheDocument();
  });

  it('renders a device row with a power switch reflecting its real state', async () => {
    mockFetch({ '/api/lights/devices': { offline: false, devices: [device()] } });
    render(<LightsWidget />);
    expect(await screen.findByText('Living Room Lamp')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('a brightness slider only shows when the device supports it and is on', async () => {
    mockFetch({
      '/api/lights/devices': {
        offline: false,
        devices: [
          device({ id: 'a', name: 'Has both, on', capabilities: ['power', 'brightness'], state: { online: true, on: true, brightness: 50 } }),
          device({ id: 'b', name: 'Has both, off', capabilities: ['power', 'brightness'], state: { online: true, on: false } }),
          device({ id: 'c', name: 'Power only', capabilities: ['power'], state: { online: true, on: true } }),
        ],
      },
    });
    render(<LightsWidget />);
    await screen.findByText('Has both, on');
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('toggling the switch posts a power command and re-polls afterward', async () => {
    let devicesOn = false;
    const fetchMock = mockFetch({
      '/api/lights/devices/hue:1/power': (url, opts) => {
        devicesOn = JSON.parse(opts.body).on;
        return { id: 'hue:1', state: { on: devicesOn } };
      },
      '/api/lights/devices': () => ({ offline: false, devices: [device({ state: { online: true, on: devicesOn, brightness: 80 } })] }),
    });
    render(<LightsWidget />);
    await screen.findByText('Living Room Lamp');
    expect(screen.getByRole('checkbox')).not.toBeChecked(); // starts off (devicesOn=false)

    await userEvent.click(screen.getByRole('checkbox'));
    expect(await screen.findByRole('checkbox')).toBeChecked();
    expect(fetchMock.calls.some(c => c.url.includes('/power') && c.opts?.method === 'POST')).toBe(true);
  });

  it('shows the unreachable badge and disables controls when offline but cached devices exist', async () => {
    mockFetch({ '/api/lights/devices': { offline: true, devices: [device()] } });
    render(<LightsWidget />);
    await screen.findByText('Living Room Lamp');
    expect(screen.getByText('unreachable')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});
