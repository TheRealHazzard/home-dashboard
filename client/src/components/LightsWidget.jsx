import { useLights } from '../hooks/useLights.js';

export default function LightsWidget() {
  const { devices, offline, loaded, setPower, setBrightness } = useLights();

  return (
    <section className="widget widget-lights">
      <h2 className="widget-title">
        Lights
        {offline && loaded && <span className="lights-offline-badge">unreachable</span>}
      </h2>
      {!loaded ? (
        <div className="widget-loading">Loading lights…</div>
      ) : devices.length === 0 ? (
        <div className="widget-empty">
          {offline ? 'smart-home-dashboard isn\'t reachable.' : 'No lights paired yet.'}
        </div>
      ) : (
        <ul className="light-list">
          {devices.map(device => (
            <li key={device.id} className={'light-row' + (offline ? ' stale' : '')}>
              <span className="light-name">{device.name}</span>
              {device.capabilities.includes('brightness') && device.state.on && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={device.state.brightness ?? 100}
                  disabled={offline}
                  onChange={e => setBrightness(device.id, Number(e.target.value))}
                />
              )}
              {device.capabilities.includes('power') && (
                <label className="light-switch">
                  <input
                    type="checkbox"
                    checked={!!device.state.on}
                    disabled={offline}
                    onChange={() => setPower(device.id, !device.state.on)}
                  />
                  <span />
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
