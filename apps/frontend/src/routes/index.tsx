import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h1>Veritas — Transparence des votes</h1>
      <p>Découvrez comment votent vos députés</p>
    </div>
  );
}
