// Basic test file for timesheetController
import { describe, it, expect } from '@jest/globals';
import * as timesheetController from '../../../server/controllers/timesheetController.js';

describe('timesheetController', () => {
  describe('calculateTotalHours', () => {
    it('should return 0 if start or end is not a valid date', () => {
      expect(timesheetController.calculateTotalHours(null, new Date(), 'No', null)).toBe(0);
      expect(timesheetController.calculateTotalHours(new Date(), null, 'No', null)).toBe(0);
    });
    it('should return 0 if end is before start', () => {
      const start = new Date('2025-06-13T10:00:00Z');
      const end = new Date('2025-06-13T09:00:00Z');
      expect(timesheetController.calculateTotalHours(start, end, 'No', null)).toBe(0);
    });
    it('should calculate hours without lunch break', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T17:00:00Z');
      expect(timesheetController.calculateTotalHours(start, end, 'No', null)).toBe(8);
    });
    it('should subtract lunch break if provided', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T17:00:00Z');
      expect(timesheetController.calculateTotalHours(start, end, 'Yes', '01:00')).toBe(7);
    });
    it('should not subtract lunch if lunchMinutes > totalMinutes', () => {
      const start = new Date('2025-06-13T09:00:00Z');
      const end = new Date('2025-06-13T10:00:00Z');
      expect(timesheetController.calculateTotalHours(start, end, 'Yes', '02:00')).toBe(1);
    });
  });
});
