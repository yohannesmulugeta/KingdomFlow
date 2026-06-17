import { describe, it, expect } from 'vitest';
import {
  gregorianToEthiopian,
  ethiopianToGregorian,
  isEthiopianLeapYear,
  isGregorianLeapYear,
  isValidEthiopianDate,
  gregorianToEthiopianDateStr,
  ethiopianDateStrToGregorian,
  formatEthiopianDate,
} from '@/lib/ethiopianCalendar';

describe('Ethiopian Calendar', () => {
  describe('isEthiopianLeapYear', () => {
    it('returns true for years divisible by 4', () => {
      expect(isEthiopianLeapYear(2016)).toBe(true);
      expect(isEthiopianLeapYear(2000)).toBe(true);
    });

    it('returns false for years not divisible by 4', () => {
      expect(isEthiopianLeapYear(2017)).toBe(false);
      expect(isEthiopianLeapYear(2019)).toBe(false);
    });
  });

  describe('isGregorianLeapYear', () => {
    it('returns true for leap years', () => {
      expect(isGregorianLeapYear(2024)).toBe(true);
      expect(isGregorianLeapYear(2000)).toBe(true);
    });

    it('returns false for non-leap years', () => {
      expect(isGregorianLeapYear(2023)).toBe(false);
      expect(isGregorianLeapYear(1900)).toBe(false);
      expect(isGregorianLeapYear(2025)).toBe(false);
    });
  });

  describe('gregorianToEthiopian', () => {
    it('converts a known date correctly', () => {
      // September 11, 2023 = Ethiopian New Year 2016
      const result = gregorianToEthiopian('2023-09-11');
      expect(result.year).toBe(2016);
      expect(result.month).toBe(1); // Meskerem
      expect(result.day).toBe(1);
    });

    it('converts mid-year date', () => {
      // Jan 15, 2024 is before Ethiopian New Year, so ethYear = 2024 - 8 = 2016
      const result = gregorianToEthiopian('2024-01-15');
      expect(result.year).toBe(2016);
    });
  });

  describe('ethiopianToGregorian', () => {
    it('converts Ethiopian New Year to Gregorian', () => {
      const result = ethiopianToGregorian(2016, 1, 1);
      // Meskerem 1, 2016 = September 11, 2023 Gregorian (2023 is not a leap year predecessor)
      expect(result).toBe('2023-09-11');
    });

    it('handles Pagumen in non-leap year', () => {
      // Meskerem 1, 2017 = Sep 12, 2024 (Gregorian leap year → Ethiopian New Year Sep 12)
      const result = ethiopianToGregorian(2017, 1, 1);
      expect(result).toBe('2024-09-12');
    });

    it('converts back and forth correctly', () => {
      // Round-trip: Gregorian → Ethiopian → Gregorian
      const original = '2025-12-01'; // well after Ethiopian New Year, safe date
      const eth = gregorianToEthiopian(original);
      const back = ethiopianToGregorian(eth.year, eth.month, eth.day);
      expect(back).toBe(original);
    });
  });

  describe('isValidEthiopianDate', () => {
    it('accepts valid dates', () => {
      expect(isValidEthiopianDate(2016, 1, 1)).toBe(true);
      expect(isValidEthiopianDate(2016, 12, 30)).toBe(true);
    });

    it('rejects invalid months', () => {
      expect(isValidEthiopianDate(2016, 0, 1)).toBe(false);
      expect(isValidEthiopianDate(2016, 14, 1)).toBe(false);
    });

    it('handles Pagume in leap year (6 days)', () => {
      expect(isValidEthiopianDate(2016, 13, 6)).toBe(true);
      expect(isValidEthiopianDate(2016, 13, 7)).toBe(false);
    });

    it('handles Pagume in non-leap year (5 days)', () => {
      expect(isValidEthiopianDate(2017, 13, 5)).toBe(true);
      expect(isValidEthiopianDate(2017, 13, 6)).toBe(false);
    });
  });

  describe('formatEthiopianDate', () => {
    it('formats short date', () => {
      expect(formatEthiopianDate(2016, 1, 1, 'short')).toBe('01/01/2016');
    });

    it('formats full date', () => {
      expect(formatEthiopianDate(2016, 1, 1, 'full')).toBe('Meskerem 1, 2016');
    });
  });
});