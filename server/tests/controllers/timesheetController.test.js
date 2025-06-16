// Basic test file for timesheetController
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract calculateTotalHours from the controller source code
let calculateTotalHours;
beforeAll(() => {
  const filePath = path.resolve(__dirname, '../../../server/controllers/timesheetController.js');
  const src = fs.readFileSync(filePath, 'utf8');
  // Extract only the right-hand side of the assignment (the arrow function)
  const match = src.match(/const calculateTotalHours = ([\s\S]*?};)/);
  if (match) {
    // eslint-disable-next-line no-eval
    calculateTotalHours = eval(match[1]);
  } else {
    throw new Error('Could not extract calculateTotalHours from timesheetController.js');
  }
});

describe('timesheetController', () => {
  describe('calculateTotalHours', () => {
    it('should return 0 if start or end is not a valid date', () => {
      expect(calculateTotalHours(null, new Date(), 'No', null)).toBe(0);
      expect(calculateTotalHours(new Date(), null, 'No', null)).toBe(0);
    });
    it('should return 0 if end is before start', () => {
      const start = new Date('2025-06-13T10:00:00Z');
      const end = new Date('2025-06-13T09:00:00Z');
      expect(calculateTotalHours(start, end, 'No', null)).toBe(0);
    });
    it('should calculate hours without lunch break', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T17:00:00Z');
      expect(calculateTotalHours(start, end, 'No', null)).toBe(8);
    });
    it('should subtract lunch break if provided', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T17:00:00Z');
      expect(calculateTotalHours(start, end, 'Yes', '01:00')).toBe(7);
    });
    it('should not subtract lunch if lunchMinutes > totalMinutes', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T10:00:00Z');
      expect(calculateTotalHours(start, end, 'Yes', '02:00')).toBe(1);
    });
  });
});
