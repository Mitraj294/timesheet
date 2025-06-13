import { jest } from '@jest/globals';

// ESM mock for Employee model
const mockEmployee = {
  findOne: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  prototype: { save: jest.fn() },
};
jest.unstable_mockModule('../../../server/models/Employee.js', () => ({ default: mockEmployee }));

// Import controller after mocking
const employeeController = await import('../../../server/controllers/employeeController.js');

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
    Object.values(mockEmployee).forEach(fn => fn.mockReset && fn.mockReset());
    if (mockEmployee.prototype.save.mockReset) mockEmployee.prototype.save.mockReset();
  });

  it('should add employee successfully', async () => {
    // Arrange
    const req = mockReq({ name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, { id: 'employerId' });
    const res = mockRes();
    mockEmployee.findOne.mockResolvedValueOnce(null); // No duplicate email
    mockEmployee.findOne.mockResolvedValueOnce(null); // No duplicate code
    mockEmployee.prototype.save.mockResolvedValue({ name: 'A', email: 'a@b.com' });
    // Act
    await employeeController.addEmployee(req, res);
    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'A' }));
  });

  // Add more tests for other controller methods and edge cases
});
