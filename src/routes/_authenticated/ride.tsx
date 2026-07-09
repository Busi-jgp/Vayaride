import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin, Navigation, Car, ArrowLeft, CreditCard, Percent,
  Clock, Users as UsersIcon, Zap, ShieldCheck
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadGoogleMaps } from "@/lib/maps/loader";

type VehicleOption = {
  id: string;
  name: string;
  icon: string;
  eta: string;
  fare: number;
  capacity: number;
  description: string;
};

const VEHICLES: VehicleOption[] = [
  { id: "economy", name: "Economy", icon: "🚗", eta: "2 min", fare: 63, capacity: 3, description: "Affordable everyday ride" },
  { id: "comfort", name: "Comfort", icon: "🚙", eta: "4 min", fare: 87, capacity: 4, description: "Newer cars with extra legroom" },
  { id: "xl", name: "XL", icon: "🚐", eta: "5 min", fare: 124, capacity: 6, description: "For groups up to 6" },
];

export const Route = createFileRoute("/_authenticated/ride")({
  component: RideRequestPage,
});

function RideRequestPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("economy");
  const [step, setStep] = useState<"search" | "select">("search");

  const currentVehicle = VEHICLES.find(v => v.id === selectedVehicle) ?? VEHICLES[0];

  const handleConfirm = () => {
    // Placeholder — would create a ride request in the DB
    navigate({ to: "/active-ride" } as any);
  };

  // Some recent destinations for quick access
  const recentPlaces = [
    { label: "Home", address: "12 Acacia Street, Vanderbijlpark", icon: "🏠" },
    { label: "Work", address: "32 Nelson Mandela Drive, Johannesburg", icon: "💼" },
    { label: "Current Location", address: "Vaal University of Technology", icon: "📍" },
  ];

  if (step === "search") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Map area placeholder */}
        <div className="relative flex-1 bg-gradient-to-br from-primary/5 to-primary/10 min-h-[200px]">
          {/* Search overlay */}
          <div className="absolute inset-0 p-4 pt-6 space-y-3 z-10">
            {/* Pickup */}
            <div className="rounded-2xl bg-card shadow-lg border p-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="h-6 w-0.5 bg-muted-foreground/30" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <Input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Current Location"
                  className="h-8 p-0 border-0 text-sm font-medium shadow-none"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="rounded-2xl bg-card shadow-lg border p-3 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-foreground/40 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Where to?</p>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Search destination..."
                  className="h-8 p-0 border-0 text-sm shadow-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Places */}
            <div className="space-y-1">
              {recentPlaces.map((place) => (
                <button
                  key={place.label}
                  onClick={() => { setDestination(place.address); setStep("select"); }}
                  className="w-full rounded-xl bg-card/90 backdrop-blur border p-3 flex items-center gap-3 hover:bg-card transition-colors"
                >
                  <span className="text-lg">{place.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{place.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vehicle selection step
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Map area */}
      <div className="h-44 bg-gradient-to-br from-primary/10 to-primary/5 relative">
        <button
          onClick={() => setStep("search")}
          className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-card shadow-lg flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="rounded-xl bg-card/90 backdrop-blur border shadow-sm px-3 py-2 flex items-center gap-2 text-sm">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate font-medium">{pickup || "Current Location"}</span>
            <span className="text-muted-foreground">→</span>
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">{destination}</span>
          </div>
        </div>
      </div>

      {/* Vehicle Options */}
      <div className="flex-1 px-4 py-4 space-y-3">
        <h2 className="font-semibold text-sm">Choose a ride</h2>

        {VEHICLES.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicle(v.id)}
            className={`w-full rounded-2xl border p-4 transition-all ${
              selectedVehicle === v.id
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{v.icon}</span>
                <div className="text-left">
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">R{v.fare}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" /> {v.eta}
                </p>
              </div>
            </div>
            {selectedVehicle === v.id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" /> Up to {v.capacity}</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Standard fare</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-card px-4 py-4 space-y-3 rounded-t-3xl">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <CreditCard className="h-4 w-4" /> Cash
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Percent className="h-4 w-4" /> Promo
            </button>
          </div>
          <p className="font-semibold text-lg">R{currentVehicle.fare}</p>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 rounded-xl text-base font-semibold">
          Confirm {currentVehicle.name}
        </Button>
      </div>
    </div>
  );
}