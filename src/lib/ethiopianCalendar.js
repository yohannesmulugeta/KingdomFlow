/**
 * Ethiopian Calendar Conversion Utilities
 *
 * Ethiopian calendar (Amete Mihret) is approximately 7-8 years behind Gregorian.
 * Ethiopian New Year falls on September 11 (or September 12 in Gregorian leap year).
 *
 * Ethiopian months (13):
 * 1. Meskerem (30 days) — starts Sep 11/12
 * 2. Tikimt (30)
 * 3. Hidar (30)
 * 4. Tahsas (30)
 * 5. Tir (30)
 * 6. Yekatit (30)
 * 7. Megabit (30)
 * 8. Miazia (30)
 * 9. Ginbot (30)
 * 10. Sene (30)
 * 11. Hamle (30)
 * 12. Nehase (30)
 * 13. Pagume (5 or 6 days in Ethiopian leap year)
 *
 * Ethiopian leap year: year % 4 === 0 (within Ethiopian calendar)
 */

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir',
  'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene',
  'Hamle', 'Nehase', 'Pagume'
];

const ETHIOPIAN_MONTHS_NUMBERED = [
  '1. Meskerem', '2. Tikimt', '3. Hidar', '4. Tahsas', '5. Tir',
  '6. Yekatit', '7. Megabit', '8. Miazia', '9. Ginbot', '10. Sene',
  '11. Hamle', '12. Nehase', '13. Pagume'
];

// JDN at Ethiopian Epoch: 1 Meskerem 1
// Gregorian: September 12, 7 AD (Julian) = JDN 1,724,225 (approximate)
// More precisely: JD 1724225.5 for Sept 12, 7 AD Gregorian calendar
const ETHIOPIC_EPOCH = 1724225.5;

/**
 * Check if a Gregorian year has February 29
 */
export function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Check if an Ethiopian year is a leap year
 */
export function isEthiopianLeapYear(ethYear) {
  return ethYear % 4 === 0;
}

/**
 * Convert Gregorian date (year, month, day) to Julian Day Number
 */
function gregorianToJDN(gYear, gMonth, gDay) {
  let a = Math.floor((14 - gMonth) / 12);
  let y = gYear + 4800 - a;
  let m = gMonth + 12 * a - 3;
  return gDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
    - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Convert Julian Day Number to Gregorian date
 */
function jdnToGregorian(jdn) {
  let a = jdn + 32044;
  let b = Math.floor((4 * a + 3) / 146097);
  let c = a - Math.floor((146097 * b) / 4);
  let d = Math.floor((4 * c + 3) / 1461);
  let e = c - Math.floor((1461 * d) / 4);
  let m = Math.floor((5 * e + 2) / 153);

  let day = e - Math.floor((153 * m + 2) / 5) + 1;
  let month = m + 3 - 12 * Math.floor(m / 10);
  let year = 100 * b + d - 4800 + Math.floor(m / 10);

  return { year, month, day };
}

/**
 * Convert Ethiopian date to Gregorian ISO date string (YYYY-MM-DD)
 */
export function ethiopianToGregorian(ethYear, ethMonth, ethDay) {
  // Calculate days from Ethiopian epoch
  let jdn = ETHIOPIC_EPOCH;

  // Full years
  for (let y = 1; y < ethYear; y++) {
    jdn += isEthiopianLeapYear(y) ? 366 : 365;
  }

  // Months in current year
  for (let m = 1; m < ethMonth; m++) {
    if (m === 13) {
      jdn += isEthiopianLeapYear(ethYear) ? 6 : 5;
    } else {
      jdn += 30;
    }
  }

  // Days
  jdn += ethDay - 1;

  const g = jdnToGregorian(jdn);
  const pad = (n) => String(n).padStart(2, '0');
  return `${g.year}-${pad(g.month)}-${pad(g.day)}`;
}

/**
 * Convert Gregorian ISO date string (YYYY-MM-DD) to Ethiopian date
 * Returns { year, month, day }
 */
export function gregorianToEthiopian(dateStr) {
  const [gYear, gMonth, gDay] = dateStr.split('-').map(Number);
  const targetJDN = gregorianToJDN(gYear, gMonth, gDay);

  // Ethiopian new year offset: 7 years behind before New Year, 8 years after
  // Ethiopian year runs Meskerem 1 (Sep 11/12) to Pagume 5/6
  let ethYear = gYear - 7;
  // Adjust: before Ethiopian New Year, subtract another year
  const ethNewYearJDN = gregorianToJDN(gYear, 9, isGregorianLeapYear(gYear - 1) ? 12 : 11);
  if (targetJDN < ethNewYearJDN) {
    ethYear--;
  }

  // Calculate days since Ethiopian New Year
  let daysSince = targetJDN - gregorianToJDN(
    gYear,
    isGregorianLeapYear(gYear - 1) ? 9 : 9,
    isGregorianLeapYear(gYear - 1) ? 12 : 11
  );
  // Recalculate ethYear based on JJDN
  let ethEpochYear = gYear - 8;
  const ethNewYearJDN2 = gregorianToJDN(ethEpochYear + 1, 9, isGregorianLeapYear(ethEpochYear) ? 12 : 11);
  if (targetJDN >= ethNewYearJDN2) {
    ethYear = ethEpochYear + 1;
  } else {
    ethYear = ethEpochYear;
  }

  // Walk from Ethiopian epoch
  let remainingJDN = targetJDN;
  let y = 1;
  while (y < ethYear) {
    remainingJDN -= isEthiopianLeapYear(y) ? 366 : 365;
    y++;
  }
  // Now remainingJDN is days since start of year
  // but we need from New Year. Let's recalculate properly.

  // Alternative: direct calculation from ethNewYearJDN2
  const ethNewYearFinal = gregorianToJDN(ethYear + 7, 9, isGregorianLeapYear(ethYear + 6) ? 12 : 11);
  let dayInYear = targetJDN - ethNewYearFinal + 1;

  // Walk through months
  let month = 1;
  while (month <= 13) {
    let daysInMonth;
    if (month === 13) {
      daysInMonth = isEthiopianLeapYear(ethYear) ? 6 : 5;
    } else {
      daysInMonth = 30;
    }
    if (dayInYear <= daysInMonth) break;
    dayInYear -= daysInMonth;
    month++;
  }

  return { year: ethYear, month, day: dayInYear };
}

/**
 * Validate Ethiopian date
 */
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

/**
 * Format Ethiopian date for display
 */
export function formatEthiopianDate(year, month, day, format = 'full') {
  if (format === 'short') {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  return `${ETHIOPIAN_MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * Parse Ethiopian date string in MM/DD/YYYY or month-name format
 */
export function parseEthiopianDate(str) {
  // Try MM/DD/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[0]);
    const d = parseInt(slashParts[1]);
    const y = parseInt(slashParts[2]);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
      if (isValidEthiopianDate(y, m, d)) {
        return { year: y, month: m, day: d };
      }
    }
  }
  // Try "Month day, year"
  const match = str.match(/^(.+?)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (match) {
    const monthName = match[1].trim().toLowerCase();
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    const monthIdx = ETHIOPIAN_MONTHS.findIndex(m => m.toLowerCase() === monthName);
    if (monthIdx >= 0 && isValidEthiopianDate(year, monthIdx + 1, day)) {
      return { year, month: monthIdx + 1, day };
    }
  }
  return null;
}

/**
 * Get month names array (with or without numbers)
 */
export function getEthiopianMonthNames(numbered = false) {
  return numbered ? [...ETHIOPIAN_MONTHS_NUMBERED] : [...ETHIOPIAN_MONTHS];
}

/**
 * Get Ethiopian year from Gregorian date (YYYY-MM-DD)
 */
export function getEthiopianYear(dateStr) {
  const eth = gregorianToEthiopian(dateStr);
  return eth.year;
}

/**
 * Convert an Ethiopian date string (YYYY-MM-DD format using Ethiopian year) to Gregorian ISO
 * Input: "2017-01-15" (Ethiopian year 2017, month 1, day 15)
 */
export function ethiopianDateStrToGregorian(ethDateStr) {
  const parts = ethDateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  if (!isValidEthiopianDate(year, month, day)) return null;
  return ethiopianToGregorian(year, month, day);
}

/**
 * Convert ISO Gregorian date to Ethiopian date string
 */
export function gregorianToEthiopianDateStr(isoDate) {
  const eth = gregorianToEthiopian(isoDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `${eth.year}-${pad(eth.month)}-${pad(eth.day)}`;
}

export { ETHIOPIAN_MONTHS as ETH_MONTHS };