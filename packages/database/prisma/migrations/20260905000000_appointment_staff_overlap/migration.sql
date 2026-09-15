-- btree_gist allows UUID equality in a GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Half-open ranges [startAt, endAt) allow back-to-back bookings
-- (10:00-11:00 and 11:00-12:00) while rejecting true overlaps.
-- Only CONFIRMED appointments occupy a staff member's calendar.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_staff_no_overlap"
  EXCLUDE USING gist (
    "businessId" WITH =,
    "staffId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
