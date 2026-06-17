/**
 * Ethiopian Calendar Conversion Utilities
 *
 * Ethiopian New Year (Meskerem 1): September 11 (or Sep 12 in the year
 * before a Gregorian leap year, i.e. when the Ethiopian year is a leap year).
 *
 * Ethiopian months (13 × 30 + 5/6 Pagume):
 * Meskerem, Tikimt, Hidar, Tahsas, Tir, Yekatit, Megabit, Miazia,
 * Ginbot, Sene, Hamle, Nehase, Pagume
 *
 * Ethiopian leap year: year % 4 === 0
 * Ethiopian year ≈ Gregorian year - 7 or -8
 */

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir',
  'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene',
  'Hamle', 'Nehase', 'Pagume'
];

export function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function isEthiopianLeapYear(ethYear) {
  return ethYear % 4 === 0;
}

/**
 * Day of year (1-365/366) for a Gregorian date
 */
function gregorianDayOfYear(year, month, day) {
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (isGregorianLeapYear(year)) monthDays[2] = 29;
  let doy = day;
  for (let m = 1; m < month; m++) doy += monthDays[m];
  return doy;
}

/**
 * Convert Ethiopian date to Gregorian ISO date string (YYYY-MM-DD)
 */
export function ethiopianToGregorian(ethYear, ethMonth, ethDay) {
  // Ethiopian New Year = Sep 11 Gregorian (or Sep 12 before Gregorian leap year)
  const gregYear = ethYear + 7;
  const newYearDay = isGregorianLeapYear(gregYear) ? 12 : 11;

  // Calculate Ethiopian day of year (1-based)
  let ethDoy = ethDay;
  for (let m = 1; m < ethMonth; m++) {
    if (m === 13) {
      ethDoy += isEthiopianLeapYear(ethYear) ? 6 : 5;
    } else {
      ethDoy += 30;
    }
  }

  // Ethiopian day 1 = Sep 11 or 12 of gregYear
  // Calculate from that baseline
  let gMonth = 9;
  let gDay = newYearDay;
  let remaining = ethDoy - 1; // days after New Year

  // Days remaining in September
  const daysInSep = 30 - newYearDay + 1;
  if (remaining < daysInSep) {
    gDay += remaining;
    return formatGregorian(gregYear, gMonth, gDay);
  }
  remaining -= daysInSep;
  gMonth = 10;

  // Walk through months
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const targetYear = remaining > (isGregorianLeapYear(gregYear + 1) ? 92 : 91) ? gregYear + 1 : gregYear;

  // Actually, let's iterate month by month
  let yr = gregYear;
  let mo = 10;
  let dy = 1;

  while (remaining > 0) {
    const md = monthDays[mo];
    const daysInThisMonth = (mo === 2 && isGregorianLeapYear(yr)) ? 29 : md;
    if (remaining < daysInThisMonth) {
      dy = 1 + remaining;
      remaining = 0;
    } else {
      remaining -= daysInThisMonth;
      mo++;
      if (mo > 12) {
        mo = 1;
        yr++;
      }
    }
  }

  return formatGregorian(yr, mo, dy);
}

function formatGregorian(year, month, day) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Convert Gregorian ISO date string (YYYY-MM-DD) to Ethiopian date
 * Returns { year, month, day }
 */
export function gregorianToEthiopian(dateStr) {
  const [gYear, gMonth, gDay] = dateStr.split('-').map(Number);

  // Ethiopian New Year: Sep 11 (or Sep 12 before Gregorian leap year)
  const newYearDay = isGregorianLeapYear(gYear) ? 12 : 11;

  let ethYear, daysFromNewYear;

  if (gMonth > 9 || (gMonth === 9 && gDay >= newYearDay)) {
    // On or after Ethiopian New Year
    ethYear = gYear - 7;
    // Days from Sep newYearDay to current date
    daysFromNewYear = dayDiff(gYear, 9, newYearDay, gYear, gMonth, gDay);
  } else {
    // Before Ethiopian New Year → still in previous Ethiopian year
    ethYear = gYear - 8;
    const prevNewYearDay = isGregorianLeapYear(gYear - 1) ? 12 : 11;
    daysFromNewYear = dayDiff(gYear - 1, 9, prevNewYearDay, gYear, gMonth, gDay);
  }

  // Now convert daysFromNewYear to Ethiopian month and day
  let remaining = daysFromNewYear;
  let month = 1;

  while (month <= 13) {
    let daysInMonth;
    if (month === 13) {
      daysInMonth = isEthiopianLeapYear(ethYear) ? 6 : 5;
    } else {
      daysInMonth = 30;
    }
    if (remaining < daysInMonth) break;
    remaining -= daysInMonth;
    month++;
  }

  // Ethiopian day is 1-based
  const day = remaining + 1;

  return { year: ethYear, month, day };
}

/**
 * Count days between two Gregorian dates (inclusive of start, exclusive of end? No — just the difference)
 * Returns number of days from (y1,m1,d1) to (y2,m2,d2), where d2 is after or equal to d1.
 * Result: 0 if same day, positive if d2 is after d1.
 */
function dayDiff(y1, m1, d1, y2, m2, d2) {
  const doy1 = gregorianDayOfYear(y1, m1, d1);
  const doy2 = gregorianDayOfYear(y2, m2, d2);

  if (y1 === y2) return doy2 - doy1;

  // Count days from y1,m1,d1 to end of y1, plus full years, plus days in y2
  const daysInY1 = isGregorianLeapYear(y1) ? 366 : 365;
  let diff = daysInY1 - doy1 + doy2;

  for (let y = y1 + 1; y < y2; y++) {
    diff += isGregorianLeapYear(y) ? 366 : 365;
  }

  return diff;
}

export function isValidEthiopianDate(year, month, day) {
  if (month < 1 || month > 13) return false;
  if (month === 13) {
    const maxDay = isEthiopianLeapYear(year) ? 6 : 5;
    if (day < 1 || day > maxDay) return false;
  } else {
    if (day < 1 || day > 30) return false;
  }
  return true;
}

export function formatEthiopianDate(year, month, day, format = 'full') {
  if (format === 'short') {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  return `${ETHIOPIAN_MONTHS[month - 1]} ${day}, ${year}`;
}

export function getEthiopianMonthNames(numbered = false) {
  return [...ETHIOPIAN_MONTHS];
}

export function ethiopianDateStrToGregorian(ethDateStr) {
  const parts = ethDateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  if (!isValidEthiopianDate(year, month, day)) return null;
  return ethiopianToGregorian(year, month, day);
}

export function gregorianToEthiopianDateStr(isoDate) {
  const eth = gregorianToEthiopian(isoDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `${eth.year}-${pad(eth.month)}-${pad(eth.day)}`;
}

export { ETHIOPIAN_MONTHS as ETH_MONTHS };