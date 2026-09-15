// Placeholder widget slots — each becomes a real component in its own
// phase (weather, tasks, links, lights). Layout stays this simple grid
// until Phase G's kiosk visual pass, once all four widgets' real content
// shapes are known and worth designing a shared WidgetGrid around.
export default function App() {
  return (
    <div className="dashboard-grid">
      <section className="widget widget-hero">Clock / Weather</section>
      <section className="widget">Tasks</section>
      <section className="widget">Quick Links</section>
      <section className="widget">Lights</section>
    </div>
  );
}
