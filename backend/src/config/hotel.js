// VNHotel is configured as a single-hotel course project.
// Override only when intentionally deploying another demo hotel.
export const SINGLE_HOTEL_CITY = String(process.env.SINGLE_HOTEL_CITY || 'Đà Lạt').trim();

export function validDateRange(checkIn, checkOut) {
  const isDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  return isDate(checkIn) && isDate(checkOut) && checkOut > checkIn;
}
