import { jest } from '@jest/globals';

// ESM mock for Employee model as a constructor function with property assignment
const mockEmployee = jest.fn(function (props) {
  Object.assign(this, props);
  this.save = mockEmployee.prototype.save;
});
mockEmployee.findOne = jest.fn();
mockEmployee.find = jest.fn();
mockEmployee.findById = jest.fn();
mockEmployee.findByIdAndUpdate = jest.fn();
mockEmployee.findOneAndDelete = jest.fn();
mockEmployee.create = jest.fn();
mockEmployee.prototype.save = jest.fn();
jest.unstable_mockModule('../../../server/models/Employee.js', () => ({ default: mockEmployee }));

// Import controller after mocking
const employeeControllerModule = await import('../../../server/controllers/employeeController.js');
const { addEmployee } = employeeControllerModule;

const mockReq = (body = {}, user = {}, params = {}) => ({ body, user, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
};

describe('employeeController', () => {
  beforeEach(() => {
    mockEmployee.mockClear();
    mockEmployee.findOne.mockReset();
    mockEmployee.find.mockReset();
    mockEmployee.findById.mockReset();
    mockEmployee.findByIdAndUpdate.mockReset();
    mockEmployee.findOneAndDelete.mockReset();
    mockEmployee.create.mockReset();
    mockEmployee.prototype.save.mockReset();
  });

  it('should add employee successfully', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce(null); // No duplicate email
    mockEmployee.findOne.mockResolvedValueOnce(null); // No duplicate code
    mockEmployee.prototype.save.mockResolvedValue({ name: 'A', email: 'a@b.com' });
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'A' }));
  });

  it('should return 400 if required fields are missing', async () => {
    // Arrange
    const req = mockReq({ name: '', email: '', employeeCode: '', wage: null }, { id: 'employerId' });
    const res = mockRes();
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('required') }));
  });

  it('should return 400 for invalid email', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'bad', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('valid email') }));
  });

  it('should return 400 for negative wage', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: -1 }, { id: 'employerId' });
    const res = mockRes();
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('non-negative number') }));
  });

  it('should return 409 if email already exists', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce({ _id: 'emp1' }); // Email exists
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('already exists') }));
  });

  it('should return 409 if employee code already exists', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce(null); // Email does not exist
    mockEmployee.findOne.mockResolvedValueOnce({ _id: 'emp2' }); // Code exists
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('already exists') }));
  });

  it('should return 400 for validation error', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce(null);
    mockEmployee.findOne.mockResolvedValueOnce(null);
    mockEmployee.prototype.save.mockRejectedValueOnce({ name: 'ValidationError', message: 'Invalid data' });
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid data' }));
  });

  it('should return 500 for server error', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce(null);
    mockEmployee.findOne.mockResolvedValueOnce(null);
    mockEmployee.prototype.save.mockRejectedValueOnce(new Error('fail'));
    // Act
    await addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Server error') }));
  });
});
