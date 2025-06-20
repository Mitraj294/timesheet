// Basic test file for settingsController
import { jest } from '@jest/globals';

let EmployerSetting, ScheduledNotification, settingsController;

describe('settingsController', () => {
  let req, res, next;
  beforeEach(async () => {
    jest.resetModules();
    req = { user: { id: 'employer1', role: 'employer', employerId: 'employer1' }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    EmployerSetting = { findOne: jest.fn(), findOneAndUpdate: jest.fn(), save: jest.fn() };
    ScheduledNotification = { find: jest.fn(), updateMany: jest.fn() };
    jest.unstable_mockModule('../../../server/models/EmployerSetting.js', () => ({
      default: EmployerSetting,
    }));
    jest.unstable_mockModule('../../../server/models/ScheduledNotification.js', () => ({
      default: ScheduledNotification,
    }));
    settingsController = await import('../../../server/controllers/settingsController.js');
  });

  it('should return 401 if no user for getEmployerSettings', async () => {
    req.user = undefined;
    await settingsController.getEmployerSettings(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 400 if employee has no employerId', async () => {
    req.user = { role: 'employee' };
    await settingsController.getEmployerSettings(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 403 for invalid role', async () => {
    req.user = { role: 'other' };
    await settingsController.getEmployerSettings(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should handle error in getEmployerSettings', async () => {
    EmployerSetting.findOne.mockRejectedValueOnce(new Error('fail'));
    await settingsController.getEmployerSettings(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 403 if not employer for updateEmployerSettings', async () => {
    req.user = { role: 'employee' };
    await settingsController.updateEmployerSettings(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should handle error in updateEmployerSettings', async () => {
    EmployerSetting.findOne.mockRejectedValueOnce(new Error('fail'));
    await settingsController.updateEmployerSettings(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
