import { jest } from '@jest/globals';

let EmployerSetting, ScheduledNotification, employerSettingsController;

describe('employerSettingsController', () => {
  let req, res;
  beforeEach(async () => {
    jest.resetModules();
    req = { user: { id: 'employer1' }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    EmployerSetting = function () {};
    EmployerSetting.findOneAndUpdate = jest.fn();
    ScheduledNotification = function () {};
    ScheduledNotification.find = jest.fn();
    jest.unstable_mockModule('../../../server/models/EmployerSetting.js', () => ({
      default: EmployerSetting,
    }));
    jest.unstable_mockModule('../../../server/models/ScheduledNotification.js', () => ({
      default: ScheduledNotification,
    }));
    employerSettingsController = await import('../../../server/controllers/employerSettingsController.js');
  });

  it('should update settings and return 200', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce({ _id: 'sid', timezone: 'UTC' });
    ScheduledNotification.find.mockResolvedValueOnce([]);
    req.body = { globalNotificationTimes: { monday: '09:00' } };
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), settings: expect.any(Object) }));
  });

  it('should return 404 if settings not updated', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce(null);
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should handle server error', async () => {
    EmployerSetting.findOneAndUpdate.mockRejectedValueOnce(new Error('fail'));
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should upsert (create) settings if not existing', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce({ _id: 'sid', timezone: 'UTC' });
    ScheduledNotification.find.mockResolvedValueOnce([]);
    req.body = { someSetting: 'value' };
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ settings: expect.any(Object) }));
  });

  it('should update notification scheduled time if changed', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce({ _id: 'sid', timezone: 'UTC' });
    const saveMock = jest.fn();
    ScheduledNotification.find.mockResolvedValueOnce([
      { scheduledTimeUTC: new Date('2025-06-13T09:00:00Z'), status: 'pending', save: saveMock }
    ]);
    req.body = { globalNotificationTimes: { friday: '10:00' } };
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should cancel notification if time is disabled', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce({ _id: 'sid', timezone: 'UTC' });
    const saveMock = jest.fn();
    ScheduledNotification.find.mockResolvedValueOnce([
      { scheduledTimeUTC: new Date('2025-06-13T09:00:00Z'), status: 'pending', save: saveMock }
    ]);
    req.body = { globalNotificationTimes: { friday: '' } };
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should not update notification if day not changed', async () => {
    EmployerSetting.findOneAndUpdate.mockResolvedValueOnce({ _id: 'sid', timezone: 'UTC' });
    const saveMock = jest.fn();
    ScheduledNotification.find.mockResolvedValueOnce([
      { scheduledTimeUTC: new Date('2025-06-13T09:00:00Z'), status: 'pending', save: saveMock }
    ]);
    req.body = { globalNotificationTimes: { monday: '10:00' } }; // Not friday
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(saveMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle validation error', async () => {
    EmployerSetting.findOneAndUpdate.mockRejectedValueOnce({ name: 'ValidationError', message: 'Invalid' });
    await employerSettingsController.updateEmployerSettingsAndReschedule(req, res);
    expect(res.status).toHaveBeenCalledWith(500); // Controller returns 500 for all errors
  });
});
