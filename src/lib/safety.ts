import type { User } from "@supabase/supabase-js";

export type TrustedContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type SosAlert = {
  id: string;
  ride_id: string;
  user_id: string;
  contact_id: string | null;
  message: string;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
};

export type TripShare = {
  ride_id: string;
  share_token: string;
  expires_at: string;
  created_at: string;
};

export type VerificationStatus = "pending" | "verified" | "failed";

export type DriverVerification = {
  id: string;
  user_id: string;
  license_number: string;
  id_document_url: string;
  selfie_url: string;
  status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

const SUPPORT_NUMBER = "+27 11 234 5678";
const SAFETY_CHECK_ITEMS = [
  "Confirm driver name and vehicle details",
  "Share trip with a trusted contact",
  "Use the pickup PIN at the door",
  "Stay on the mapped route",
  "Do not share your OTP or PIN with strangers",
];

export function getEmergencyNumber() {
  return SUPPORT_NUMBER;
}

export function getSafetyChecklist() {
  return [...SAFETY_CHECK_ITEMS];
}

export function generateRidePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function buildTripShareLink(rideId: string, token: string) {
  return `${window.location.origin}/share/ride/${rideId}?token=${token}`;
}

export function createSosMessage(user: User | null, rideId: string, lat?: number | null, lng?: number | null) {
  const locationPart = lat != null && lng != null ? `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Location: unavailable";
  return `SOS from ${user?.email ?? "rider"} for ride ${rideId}. ${locationPart}. Call ${SUPPORT_NUMBER}.`;
}

export function isDeviationRisk(currentLat: number, currentLng: number, expectedPath: Array<{ lat: number; lng: number }>) {
  if (!expectedPath.length) return false;
  const thresholdMeters = 200;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const distanceBetween = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const closest = expectedPath.reduce((best, point) => {
    const d = distanceBetween(currentLat, currentLng, point.lat, point.lng);
    return d < best.distance ? { point, distance: d } : best;
  }, { point: expectedPath[0], distance: Number.POSITIVE_INFINITY });

  return closest.distance > thresholdMeters;
}

export function verifyDriverIdentity(driver: DriverVerification) {
  return driver.status === "verified";
}

export function buildTrustedContactMessage(contact: TrustedContact, rideId: string) {
  return `Trusted contact ${contact.name} has been notified about ride ${rideId}. Please call ${contact.phone} if you need help.`;
}

export function incidentReportPayload(rideId: string, userId: string, description: string, location?: { lat: number; lng: number }) {
  return {
    ride_id: rideId,
    user_id: userId,
    description,
    location_lat: location?.lat ?? null,
    location_lng: location?.lng ?? null,
    created_at: new Date().toISOString(),
  };
}

export function validatePickupLocation(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function createSosAlertPayload(rideId: string, userId: string, contactId: string | null, message: string, lat?: number | null, lng?: number | null) {
  return {
    ride_id: rideId,
    user_id: userId,
    contact_id: contactId,
    message,
    location_lat: lat ?? null,
    location_lng: lng ?? null,
    created_at: new Date().toISOString(),
  };
}

export function createTripSharePayload(rideId: string, shareToken: string, expiresInMinutes = 180) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60_000);
  return {
    ride_id: rideId,
    share_token: shareToken,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };
}

export function buildEmergencyAlert(user: User | null, rideId: string, contactPhone: string) {
  return `Emergency alert: ${user?.email ?? "User"} on ride ${rideId}. Contact ${contactPhone} immediately.`;
}

export function getSafetyMonitorState(rideStatus: string, driverVerified: boolean, trustedContactsCount: number) {
  return {
    active: rideStatus === "active",
    needsVerification: !driverVerified,
    trustedContactCoverage: trustedContactsCount > 0,
  };
}
