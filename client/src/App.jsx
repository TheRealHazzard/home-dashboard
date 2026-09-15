import ClockWeatherHero from './components/ClockWeatherHero.jsx';
import TasksWidget from './components/TasksWidget.jsx';
import LinksWidget from './components/LinksWidget.jsx';

// Placeholder widget slots — each becomes a real component in its own
// phase (weather, tasks, links, lights). Layout stays this simple grid
// until Phase G's kiosk visual pass, once all four widgets' real content
// shapes are known and worth designing a shared WidgetGrid around.
export default function App() {
  return (
    <div className="dashboard-grid">
      <ClockWeatherHero />
      <TasksWidget />
      <LinksWidget />
      <section className="widget">Lights</section>
    </div>
  );
}
