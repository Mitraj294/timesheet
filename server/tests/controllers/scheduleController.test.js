// Basic test file for scheduleController
import { jest } from '@jest/globals';

let Schedule, Employee, sendScheduleAssignmentEmail, scheduleController;

describe('scheduleController', () => {
  let req, res;
  beforeEach(async () => {
    jest.resetModules();
    req = { user: { _id: 'employer1', role: 'employer' }, body: [] };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    Schedule = { insertMany: jest.fn() };
    Employee = { findById: jest.fn() };
    sendScheduleAssignmentEmail = jest.fn();
    jest.unstable_mockModule('../../../server/models/Schedule.js', () => ({
      default: Schedule,
    }));
    jest.unstable_mockModule('../../../server/models/Employee.js', () => ({
      default: Employee,
    }));
    jest.unstable_mockModule('../../../server/services/emailService.js', () => ({
      sendScheduleAssignmentEmail,
      sendScheduleUpdateEmail: jest.fn(),
      default: { sendScheduleAssignmentEmail, sendScheduleUpdateEmail: jest.fn() },
    }));
    scheduleController = await import('../../../server/controllers/scheduleController.js');
  });

  it('should return 400 if no schedules provided', async () => {
    req.body = [];
    await scheduleController.createBulkSchedules(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle error in createBulkSchedules', async () => {
    req.body = [{ startTime: '09:00', endTime: '17:00', date: '2025-06-13', employee: 'emp1' }];
    Schedule.insertMany.mockRejectedValueOnce(new Error('fail'));
    await scheduleController.createBulkSchedules(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // Add more tests for successful creation, email notification, etc. as needed
});
