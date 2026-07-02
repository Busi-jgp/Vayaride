import { createFileRoute } from "@tanstack/react-router";
import { RoutePlanner } from "@/components/routes/RoutePlanner";

export const Route = createFileRoute("/_authenticated/routes")({
  component: RoutesPage,
});

function RoutesPage() {
  return <RoutePlanner />;
}