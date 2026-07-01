import { createFileRoute } from "@tanstack/react-router";
import { Map, Construction } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/routes")({
  component: RoutesPage,
});

function RoutesPage() {
  const { t } = useI18n();

  return (
    <div className="px-4 py-4">
      <div className="text-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Map className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold">{t("planRoute")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Plan your taxi route across South African cities. Route planning with taxi ranks and estimated fares coming soon.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <Construction className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("comingSoon")}</span>
        </div>
      </div>
    </div>
  );
}