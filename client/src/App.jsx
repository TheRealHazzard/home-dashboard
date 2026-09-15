import ClockWeatherHero from './components/ClockWeatherHero.jsx';
import TasksWidget from './components/TasksWidget.jsx';
import LinksWidget from './components/LinksWidget.jsx';
import LightsWidget from './components/LightsWidget.jsx';

// All four widget slots are real now — Phase G's kiosk visual pass still
// owns the actual layout tuning (a shared WidgetGrid, real type scale)
// once they're all viewed on the mounted device.
export default function App() {
  return (
    <div className="dashboard-grid">
      <ClockWeatherHero />
      <TasksWidget />
      <LinksWidget />
      <LightsWidget />
    </div>
  );
}
