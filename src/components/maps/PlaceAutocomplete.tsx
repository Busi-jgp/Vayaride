/// <reference types="google.maps" />
// South-African-biased place autocomplete using Places API (New).
// Renders a normal input; queries suggestions on type, calls onSelect with address + lat/lng.
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/maps/loader";

type Selected = { address: string; lat: number; lng: number };

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: Selected) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(async () => {
      const places = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      sessionRef.current = new places.AutocompleteSessionToken();
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value || value.length < 3) { setSuggestions([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const places = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionRef.current ?? undefined,
          includedRegionCodes: ["za"],
        });
        setSuggestions(suggestions.slice(0, 5));
        setOpen(true);
      } catch (e) {
        console.error("autocomplete failed", e);
      }
    }, 250);
  }, [value]);

  const pick = async (s: google.maps.places.AutocompleteSuggestion) => {
    const pred = s.placePrediction;
    if (!pred) return;
    const place = pred.toPlace();
    await place.fetchFields({ fields: ["formattedAddress", "location"] });
    const loc = place.location;
    if (!loc) return;
    const address = place.formattedAddress ?? pred.text.toString();
    onChange(address);
    onSelect({ address, lat: loc.lat(), lng: loc.lng() });
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {s.placePrediction?.text.toString()}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
