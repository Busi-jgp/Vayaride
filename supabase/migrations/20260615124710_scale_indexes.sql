-- =============================================================================
-- SCALE INDEXES
-- Covers every query pattern in the app. Run this before you go live at scale.
-- Safe to apply to an existing database — all use IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rides
-- Queries:
--   .eq("status", "upcoming").gte("scheduled_time", now).order("scheduled_time")
--   .eq("driver_id", user.id).order("scheduled_time", desc)
--   .eq("id", rideId)  ← already a PK, no index needed
--   admin: SELECT count(*) FROM rides
-- -----------------------------------------------------------------------------

-- Ride listing page: filter upcoming + sort by time (most used query in the app)
CREATE INDEX IF NOT EXISTS idx_rides_status_scheduled_time
  ON public.rides (status, scheduled_time ASC)
  WHERE status = 'upcoming';

-- Driver history page: all rides by a driver, newest first
CREATE INDEX IF NOT EXISTS idx_rides_driver_id_scheduled_time
  ON public.rides (driver_id, scheduled_time DESC);

-- Seat decrement trigger locks this row — index makes the lookup fast under concurrency
CREATE INDEX IF NOT EXISTS idx_rides_id_available_seats
  ON public.rides (id, available_seats);

-- Geo bounding box queries (for future find_matching_rides RPC)
CREATE INDEX IF NOT EXISTS idx_rides_pickup_coords
  ON public.rides (pickup_lat, pickup_lng)
  WHERE status = 'upcoming';

-- -----------------------------------------------------------------------------
-- ride_participants
-- Queries:
--   .eq("ride_id", rideId)              ← list passengers for a ride
--   .eq("user_id", user.id)             ← rider history + booking check
--   .eq("ride_id", ...).eq("user_id")   ← check if already joined
--   trigger: seat decrement on INSERT/DELETE
-- -----------------------------------------------------------------------------

-- Passenger list for a ride detail page
CREATE INDEX IF NOT EXISTS idx_ride_participants_ride_id
  ON public.ride_participants (ride_id);

-- Rider history page: all bookings by a user, newest first
CREATE INDEX IF NOT EXISTS idx_ride_participants_user_id_joined_at
  ON public.ride_participants (user_id, joined_at DESC);

-- "Have I already joined this ride?" check on booking
CREATE INDEX IF NOT EXISTS idx_ride_participants_ride_user
  ON public.ride_participants (ride_id, user_id);

-- Active (non-cancelled) participants only — used in RLS policies + ratings check
CREATE INDEX IF NOT EXISTS idx_ride_participants_active
  ON public.ride_participants (ride_id, user_id)
  WHERE cancelled_at IS NULL;

-- -----------------------------------------------------------------------------
-- ride_locations
-- Queries:
--   upsert by ride_id (PK — already indexed)
--   realtime channel subscribed by ride_id
--   RLS policy: check driver_id on every write
-- -----------------------------------------------------------------------------

-- RLS policy on every upsert checks driver_id — this makes that lookup instant
CREATE INDEX IF NOT EXISTS idx_ride_locations_driver_id
  ON public.ride_locations (driver_id);

-- -----------------------------------------------------------------------------
-- refunds
-- Queries:
--   admin: .select("*").order("created_at", desc)
--   .eq("user_id", user.id)   ← user views own refunds
--   .eq("id", id)             ← admin approves/rejects
-- -----------------------------------------------------------------------------

-- Admin refund queue: all refunds newest first
CREATE INDEX IF NOT EXISTS idx_refunds_created_at
  ON public.refunds (created_at DESC);

-- User views own refunds
CREATE INDEX IF NOT EXISTS idx_refunds_user_id
  ON public.refunds (user_id);

-- Filter by status (pending queue for admin)
CREATE INDEX IF NOT EXISTS idx_refunds_status
  ON public.refunds (status)
  WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- ratings
-- Queries:
--   RLS policy: check rater_id, ratee_id, ride_id on every insert
--   .eq("ratee_id", userId) — driver's rating history (future)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ratings_ride_id
  ON public.ratings (ride_id);

CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id
  ON public.ratings (ratee_id);

-- -----------------------------------------------------------------------------
-- user_roles
-- Queries:
--   has_role() called on EVERY authenticated request via RLS policies
--   .eq("user_id", user.id).select("role")
-- This is the hottest index in the entire app — every page load hits it.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

-- Composite: exact lookup used inside has_role()
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- -----------------------------------------------------------------------------
-- saved_locations
-- Queries:
--   .eq("user_id", user.id)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id
  ON public.saved_locations (user_id);

-- -----------------------------------------------------------------------------
-- profiles
-- Queries:
--   .eq("id", user.id)              ← PK, already indexed
--   profile_directory view SELECT   ← full scan, acceptable (read-only, small cols)
--   get_driver_contact() RPC        ← lookups by ride_id then profiles.id (PK)
-- No additional indexes needed here — all access is by PK.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- ANALYZE
-- Tell Postgres to collect fresh statistics so the query planner uses
-- the new indexes immediately instead of waiting for autovacuum.
-- =============================================================================

ANALYZE public.rides;
ANALYZE public.ride_participants;
ANALYZE public.ride_locations;
ANALYZE public.refunds;
ANALYZE public.ratings;
ANALYZE public.user_roles;
ANALYZE public.saved_locations;
ANALYZE public.profiles;
