// Parses a `<input type="date">` value ("YYYY-MM-DD") as a local calendar
// date at midnight. `new Date(value)` would parse it as UTC midnight
// instead, which shifts to the previous day in negative UTC offsets.
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Guard against JS silently normalizing an invalid date (e.g. Feb 30)
  // into a different, wrong one instead of rejecting it.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}
