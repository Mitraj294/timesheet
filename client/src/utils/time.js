// src/utils/time.js
// Centralized time conversion helpers for timesheet app
import { DateTime } from 'luxon';

/**
 * Converts local date+time+timezone to UTC ISO string for backend.
 * @param {string} date - 'YYYY-MM-DD'
 * @param {string} time - 'HH:mm'
 * @param {string} tz - IANA timezone string (e.g. 'Asia/Kolkata')
 * @returns {string|null} UTC ISO string or null if invalid
 */
export function localTimeToUtcIso(date, time, tz) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const dt = DateTime.fromFormat(`${date}T${time}`, "yyyy-MM-dd'T'HH:mm", { zone });
    if (!dt.isValid) return null;
    return dt.toUTC().toISO();
  } catch {
    return null;
  }
}

/**
 * Converts UTC ISO string to local 'HH:mm' string for UI display.
 * @param {string} isoStr - UTC ISO string
 * @param {string} tz - IANA timezone string (e.g. 'Asia/Kolkata')
 * @returns {string} 'HH:mm' or '' if invalid
 */
export function utcIsoToLocalTime(isoStr, tz) {
  if (!isoStr) return '';
  const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const dt = DateTime.fromISO(isoStr, { zone: 'utc' });
    if (!dt.isValid) return '';
    return dt.setZone(zone).toFormat('HH:mm');
  } catch {
    return '';
  }
}
