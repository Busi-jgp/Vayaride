import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function SOSButton() {
  const [busy, setBusy] = useState(false);
  const trigger = () => {
    setBusy(true);
    if (!navigator.geolocation) {
      toast.error("Location unavailable");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const link = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const msg = `🚨 SOS — I need help. My location: ${link}`;
        if (navigator.share) {
          navigator.share({ title: "VayaRide SOS", text: msg }).catch(() => {});
        } else {
          navigator.clipboard.writeText(msg);
          toast.success("SOS link copied. Share it with someone you trust.");
        }
        setBusy(false);
      },
      () => {
        toast.error("Could not get location");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  return (
    <button
      onClick={trigger}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-bold shadow"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      SOS
    </button>
  );
}
