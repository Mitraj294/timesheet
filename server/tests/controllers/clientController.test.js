import { jest } from '@jest/globals';
import clientControllerFactory from '../../../server/controllers/clientController.js';

// --- PATCH: Make mockClient a constructor with static methods ---
function MockClient(doc) {
  if (doc) Object.assign(this, doc);
  this.save = jest.fn().mockResolvedValue(this);
}
MockClient.findOne = jest.fn();
MockClient.find = jest.fn();
MockClient.findByIdAndUpdate = jest.fn();
MockClient.findOneAndDelete = jest.fn();
MockClient.create = jest.fn();

const mockEmployee = { findOne: jest.fn(), find: jest.fn() };
const mockProject = { find: jest.fn() };
const mockTimesheet = { find: jest.fn() };
const mockSendEmail = jest.fn();
const mockGenerateReport = jest.fn();
const mockSendExcel = jest.fn();
const mockMongoose = { Types: { ObjectId: { isValid: jest.fn(() => true) } } };

// Helper to mock chainable Mongoose methods
function mockFindChain(result = []) {
  return {
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue(result),
    exec: jest.fn().mockResolvedValue(result),
  };
}
function mockFindOneChain(result = {}) {
  return {
    select: jest.fn().mockResolvedValue(result),
    exec: jest.fn().mockResolvedValue(result),
  };
}

const mockReq = (body = {}, user = {}, params = {}) => ({ body, user, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
};

describe('clientController', () => {
  let controller;
  beforeAll(() => {
    controller = clientControllerFactory({
      Client: MockClient,
      Employee: mockEmployee,
      Project: mockProject,
      Timesheet: mockTimesheet,
      sendEmail: mockSendEmail,
      generateClientTimesheetReport: mockGenerateReport,
      sendExcelDownload: mockSendExcel,
      mongoose: mockMongoose,
    });
  });
  beforeEach(() => {
    // Reset all mocks
    [
      MockClient.findOne,
      MockClient.find,
      MockClient.findByIdAndUpdate,
      MockClient.findOneAndDelete,
      MockClient.create,
    ].forEach(fn => fn.mockReset && fn.mockReset());
    Object.values(mockEmployee).forEach(fn => fn.mockReset && fn.mockReset());
    Object.values(mockProject).forEach(fn => fn.mockReset && fn.mockReset());
    Object.values(mockTimesheet).forEach(fn => fn.mockReset && fn.mockReset());
    mockSendEmail.mockReset();
    mockGenerateReport.mockReset();
    mockSendExcel.mockReset();
    mockMongoose.Types.ObjectId.isValid.mockReset();

    // Default: chainable mocks for find/findOne
    MockClient.find.mockImplementation(() => mockFindChain([]));
    MockClient.findOne.mockImplementation(() => mockFindOneChain({}));
    MockClient.create.mockImplementation(async doc => doc);
    mockEmployee.findOne.mockImplementation(() => mockFindOneChain({}));
    mockProject.find.mockImplementation(() => mockFindChain([]));
    mockTimesheet.find.mockImplementation(() => mockFindChain([]));
  });
  afterEach(() => { jest.clearAllMocks(); });

  it('should return 400 if required fields are missing', async () => {
    const req = mockReq({ name: '', emailAddress: '', phoneNumber: '' }, { id: 'employer1', role: 'employer' });
    const res = mockRes();
    await controller.createClient(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 400 for invalid email', async () => {
    const req = mockReq({ name: 'A', emailAddress: 'bad', phoneNumber: '123' });
    const res = mockRes();
    await controller.createClient(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 409 if client name exists', async () => {
    MockClient.findOne.mockResolvedValueOnce({});
    const req = mockReq({ name: 'A', emailAddress: 'a@b.com', phoneNumber: '123' });
    const res = mockRes();
    await controller.createClient(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it('should handle server error', async () => {
    MockClient.findOne.mockRejectedValueOnce(new Error('fail'));
    const req = mockReq({ name: 'A', emailAddress: 'a@b.com', phoneNumber: '123' });
    const res = mockRes();
    await controller.createClient(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });


  it('should return 403 for invalid role', async () => {
    const req = mockReq({}, { id: 'u', role: 'other' });
    const res = mockRes();
    await controller.getClients(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('should return empty array for employee with no employer', async () => {
    // Patch for .findOne().select().lean()
    mockEmployee.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })
    });
    const req = mockReq({}, { id: 'e', role: 'employee' });
    const res = mockRes();
    await controller.getClients(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('should return 400 for invalid ObjectId', async () => {
    mockMongoose.Types.ObjectId.isValid.mockReturnValueOnce(false);
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'bad' });
    const res = mockRes();
    await controller.getClientById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 400 for employee with no employer', async () => {
    mockEmployee.findOne.mockResolvedValueOnce(null);
    const req = mockReq({}, { id: 'e', role: 'employee' }, { id: 'cid' });
    const res = mockRes();
    await controller.getClientById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 400 if client not found', async () => {
    MockClient.findOne.mockResolvedValueOnce(null);
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.getClientById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });


  it('should return 400 for invalid email', async () => {
    const req = mockReq({ emailAddress: 'bad' }, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.updateClient(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('should return 404 if client not found', async () => {
    MockClient.findOne.mockResolvedValueOnce(null);
    const req = mockReq({ name: 'A', emailAddress: 'a@b.com' }, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.updateClient(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('should return 409 if duplicate name', async () => {
    MockClient.findOne.mockResolvedValueOnce({ _id: 'cid', name: 'A' });
    MockClient.findOne.mockResolvedValueOnce({}); // duplicate name
    const req = mockReq({ name: 'B', emailAddress: 'a@b.com' }, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.updateClient(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it('should update and return client', async () => {
    MockClient.findOne.mockResolvedValueOnce({ _id: 'cid', name: 'A' });
    MockClient.findOne.mockResolvedValueOnce(null); // no duplicate
    MockClient.findByIdAndUpdate.mockResolvedValueOnce({ _id: 'cid', name: 'B' });
    const req = mockReq({ name: 'B', emailAddress: 'a@b.com' }, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.updateClient(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 'cid', name: 'B' });
  });
  it('should handle server error', async () => {
    MockClient.findOne.mockRejectedValueOnce(new Error('fail'));
    const req = mockReq({ name: 'A', emailAddress: 'a@b.com' }, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.updateClient(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 404 if client not found', async () => {
    MockClient.findOneAndDelete.mockResolvedValueOnce(null);
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.deleteClient(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('should delete and return success', async () => {
    MockClient.findOneAndDelete.mockResolvedValueOnce({ _id: 'cid' });
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.deleteClient(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client deleted successfully' });
  });
  it('should handle server error', async () => {
    MockClient.findOneAndDelete.mockRejectedValueOnce(new Error('fail'));
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.deleteClient(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 404 if client not found', async () => {
    MockClient.findOne.mockResolvedValueOnce(null);
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.getClientProjects(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('should return projects for client', async () => {
    MockClient.findOne.mockResolvedValueOnce({ _id: 'cid' });
    mockProject.find.mockResolvedValueOnce([{ _id: 'pid', name: 'P' }]);
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.getClientProjects(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'pid', name: 'P' }]);
  });
  it('should handle server error', async () => {
    MockClient.findOne.mockRejectedValueOnce(new Error('fail'));
    const req = mockReq({}, { id: 'employer1', role: 'employer' }, { id: 'cid' });
    const res = mockRes();
    await controller.getClientProjects(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 404 if no clients', async () => {
    // Patch for .find().select().lean()
    MockClient.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });
    const req = mockReq({}, { id: 'employer1', role: 'employer' });
    const res = mockRes();
    await controller.downloadClients(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should handle error and call res.status(500)', async () => {
    // Patch for .find().select().lean() throwing
    MockClient.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('fail'))
      })
    });
    const req = mockReq({}, { id: 'employer1', role: 'employer' });
    const res = mockRes();
    await controller.downloadClients(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 404 if no clients (report)', async () => {
    // Patch for .find().select().lean()
    MockClient.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });
    const req = mockReq({ email: 'a@b.com' }, { id: 'employer1', role: 'employer' });
    const res = mockRes();
    await controller.sendClientsReportEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should handle error and call res.status(500) (report)', async () => {
    // Patch for .find().select().lean() throwing
    MockClient.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('fail'))
      })
    });
    const req = mockReq({ email: 'a@b.com' }, { id: 'employer1', role: 'employer' });
    const res = mockRes();
    await controller.sendClientsReportEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
