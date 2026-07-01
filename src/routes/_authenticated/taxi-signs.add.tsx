import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Upload, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const PROVINCES = [
  "Gauteng", "KwaZulu-Natal", "Western Cape", "Eastern Cape",
  "Free State", "Mpumalanga", "Limpopo", "North West", "Northern Cape",
];

export const Route = createFileRoute("/_authenticated/taxi-signs/add")({
  component: AddTaxiSignPage,
});

function AddTaxiSignPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [suburb, setSuburb] = useState("");
  const [destination, setDestination] = useState("");
  const [taxiRank, setTaxiRank] = useState("");
  const [description, setDescription] = useState("");
  const [alternativeSign, setAlternativeSign] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!province || !city || !destination || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase as any).from("taxi_signs").insert({
      province,
      city,
      suburb,
      destination,
      taxi_rank: taxiRank,
      hand_sign_description: description,
      alternative_sign: alternativeSign || null,
      notes: notes || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      created_by: user.id,
      status: "pending",
      verified: false,
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubmitted(true);
    toast.success(t("submittedForReview"));
  };

  if (submitted) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{t("addTaxiSignTitle")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t("submittedForReview")}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate({ to: "/taxi-signs" })}>
            {t("back")}
          </Button>
          <Button onClick={() => setSubmitted(false)}>
            {t("addTaxiSign")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/taxi-signs" })}
          className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">{t("addTaxiSignTitle")}</h1>
          <p className="text-xs text-muted-foreground">{t("addTaxiSignDesc")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("province")} *</Label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm mt-1"
              required
            >
              <option value="">Select</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("city")} *</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Johannesburg"
              required
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>{t("suburb")}</Label>
          <Input
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="e.g. Soweto (optional)"
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t("destination")} *</Label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Sandton City"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t("taxiRank")}</Label>
          <Input
            value={taxiRank}
            onChange={(e) => setTaxiRank(e.target.value)}
            placeholder="e.g. Bara Taxi Rank"
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t("description")} *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the hand sign in detail..."
            required
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label>{t("alternativeSignLabel")}</Label>
          <Textarea
            value={alternativeSign}
            onChange={(e) => setAlternativeSign(e.target.value)}
            placeholder="Alternative hand sign if exists..."
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div>
          <Label>{t("additionalNotes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any useful notes for commuters..."
            className="mt-1 min-h-[60px]"
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Latitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-26.2041"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="28.0473"
              className="mt-1"
            />
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Your submission will be reviewed by moderators before it becomes publicly visible.
          </p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </div>
  );
}