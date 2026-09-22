export function formatLocation(location: string | null | undefined): string {
  if (!location) return 'Not specified';
  try {
    const parsed = JSON.parse(location);
    if (parsed.city && parsed.state) {
      return `${parsed.city}, ${parsed.state}`;
    }
    if (parsed.state) return parsed.state;
    if (parsed.city) return parsed.city;
  } catch (e) {
    // If it's not JSON, just return the string as is.
  }
  return location;
}
