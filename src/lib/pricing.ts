import type { DateTime } from "luxon";

export type VehicleType = "economy" | "comfort" | "xl" | "cargo";

export type FareEstimate = {
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  surgeMultiplier: number;
  nightMultiplier: number;
  dynamicMultiplier: number;
  totalFare: number;
  perSeatFare: number;
  minFare: number;
};

export type NegotiationRange = {
  referenceFare: number;
  minimumOffer: number;
  maximumOffer: number;
  message: string;
};

export type NegotiationResult = {
  accepted: boolean;
  offer: number;
  minimumOffer: number;
  maximumOffer: number;
  reason: string;
};

export type PricingConfig = {
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  bookingFee: number;
  seatMultiplier: number;
};

const VEHICLE_CONFIG: Record<VehicleType, PricingConfig> = {
  economy: {
    baseFare: 18,
    perKm: 5.2,
    perMinute: 1.8,
    minimumFare: 30,
    bookingFee: 3.5,
    seatMultiplier: 1,
  },
  comfort: {
    baseFare: 25,
    perKm: 6.8,
    perMinute: 2.3,
    minimumFare: 44,
    bookingFee: 4.5,
    seatMultiplier: 1.15,
  },
  xl: {
    baseFare: 35,
    perKm: 8.4,
    perMinute: 2.9,
    minimumFare: 55,
    bookingFee: 5.5,
    seatMultiplier: 1.4,
  },
  cargo: {
    baseFare: 38,
    perKm: 9.2,
    perMinute: 3.3,
    minimumFare: 65,
    bookingFee: 6.5,
    seatMultiplier: 1.8,
  },
};

const PEAK_HOURS = [7, 8, 9, 16, 17, 18, 19];
const NIGHT_HOURS = [22, 23, 0, 1, 2, 3, 4, 5];
const NEGOTIATION_BOUNDS = {
  min: 0.7,
  max: 1.3,
};

function isPeakHour(date: Date) {
  return PEAK_HOURS.includes(date.getHours());
}

function isNightHour(date: Date) {
  return NIGHT_HOURS.includes(date.getHours());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getDynamicMultiplier(distanceKm: number, durationMin: number) {
  if (distanceKm < 5 && durationMin < 12) return 1;
  if (distanceKm >= 15 || durationMin >= 35) return 1.08;
  return 1.02;
}

export function estimateFare(
  distanceKm: number,
  durationMin: number,
  vehicleType: VehicleType = "economy",
  pickupTime: Date = new Date(),
  dynamicMultiplier = 1,
  seats = 1,
): FareEstimate {
  const config = VEHICLE_CONFIG[vehicleType];
  const surgeMultiplier = isPeakHour(pickupTime) ? 1.25 : 1;
  const nightMultiplier = isNightHour(pickupTime) ? 1.18 : 1;
  const distanceFare = distanceKm * config.perKm;
  const timeFare = durationMin * config.perMinute;
  const rawFare = config.baseFare + distanceFare + timeFare;
  const fareBeforeMinimum = (rawFare + config.bookingFee) * surgeMultiplier * nightMultiplier * dynamicMultiplier;
  const totalFare = Math.max(fareBeforeMinimum, config.minimumFare) * config.seatMultiplier;
  const perSeatFare = totalFare / Math.max(seats, 1);

  return {
    vehicleType,
    distanceKm,
    durationMin,
    baseFare: config.baseFare,
    distanceFare,
    timeFare,
    bookingFee: config.bookingFee,
    surgeMultiplier,
    nightMultiplier,
    dynamicMultiplier,
    totalFare: Math.round(totalFare * 100) / 100,
    perSeatFare: Math.round(perSeatFare * 100) / 100,
    minFare: config.minimumFare,
  };
}

export function finalFare(
  distanceKm: number,
  durationMin: number,
  vehicleType: VehicleType = "economy",
  pickupTime: Date = new Date(),
  dynamicMultiplier = 1,
  negotiatedFare?: number,
  seats = 1,
): FareEstimate {
  const estimate = estimateFare(distanceKm, durationMin, vehicleType, pickupTime, dynamicMultiplier, seats);
  if (negotiatedFare != null && negotiatedFare > 0) {
    const perSeat = Math.round((negotiatedFare / Math.max(seats, 1)) * 100) / 100;
    return { ...estimate, totalFare: negotiatedFare, perSeatFare: perSeat };
  }
  return estimate;
}

export function startNegotiation(referenceFare: number): NegotiationRange {
  const minimumOffer = Math.round(referenceFare * NEGOTIATION_BOUNDS.min * 100) / 100;
  const maximumOffer = Math.round(referenceFare * NEGOTIATION_BOUNDS.max * 100) / 100;
  return {
    referenceFare,
    minimumOffer,
    maximumOffer,
    message: `Offers must stay between R${minimumOffer.toFixed(2)} and R${maximumOffer.toFixed(2)}.`,
  };
}

export function submitOffer(offer: number, referenceFare: number): NegotiationResult {
  const minimumOffer = Math.round(referenceFare * NEGOTIATION_BOUNDS.min * 100) / 100;
  const maximumOffer = Math.round(referenceFare * NEGOTIATION_BOUNDS.max * 100) / 100;
  const accepted = offer >= minimumOffer && offer <= maximumOffer;
  return {
    accepted,
    offer,
    minimumOffer,
    maximumOffer,
    reason: accepted
      ? "Offer accepted within negotiated bounds."
      : `Offer must be between R${minimumOffer.toFixed(2)} and R${maximumOffer.toFixed(2)}.`,
  };
}

export function splitFare(totalFare: number, seats: number) {
  return Math.round((totalFare / Math.max(seats, 1)) * 100) / 100;
}

export function formatFare(amount: number) {
  return `R${amount.toFixed(2)}`;
}
