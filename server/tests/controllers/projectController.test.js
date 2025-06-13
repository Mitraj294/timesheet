// Basic test file for projectController
import { jest } from '@jest/globals';
import * as projectController from '../../../server/controllers/projectController.js';

describe('projectController', () => {
  let req, res, Project, Timesheet, generateProjectTimesheetReport, sendExcelDownload, sendEmail;
  beforeEach(() => {
    req = { params: {}, body: {}, user: { id: 'employer1', role: 'employer' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), end: jest.fn() };
    Project = { find: jest.fn(), findById: jest.fn(), findOne: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn() };
    Timesheet = { find: jest.fn(), aggregate: jest.fn() };
    generateProjectTimesheetReport = jest.fn();
    sendExcelDownload = jest.fn();
    sendEmail = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if project name or clientId missing', async () => {
    req.body = { name: '' };
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 400 for invalid clientId', async () => {
    req.body = { name: 'P' };
    req.params.clientId = 'bad';
    jest.spyOn(require('mongoose').Types.ObjectId, 'isValid').mockReturnValueOnce(false);
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should handle duplicate project error', async () => {
    req.body = { name: 'P' };
    req.params.clientId = 'cid';
    Project.save = jest.fn().mockRejectedValueOnce({ code: 11000 });
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it('should handle server error on create', async () => {
    req.body = { name: 'P' };
    req.params.clientId = 'cid';
    Project.save = jest.fn().mockRejectedValueOnce(new Error('fail'));
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  // Add more tests for getAllProjects, getProjectsByClientId, getProjectById, updateProject, deleteProject, downloadProjectReport, sendProjectReportEmail as needed
});
