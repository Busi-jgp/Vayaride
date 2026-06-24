// Loads the Google Maps JS API using your own browser key.
// Set VITE_GOOGLE_MAPS_BROWSER_KEY in your .env file.
// Obtain a key at https://console.cloud.google.com — restrict it to HTTP referrers for your domain.

let _loaded = false;
let _promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (_loaded) return Promise.resolve();
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!key) {
      console.warn("[VayaRide] VITE_GOOGLE_MAPS_BROWSER_KEY is not set — Maps will not load.");
      return reject(new Error("Missing VITE_GOOGLE_MAPS_BROWSER_KEY"));
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => { _loaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return _promise;
}
