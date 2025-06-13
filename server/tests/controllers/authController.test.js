// ESM-compatible mocking for bcryptjs and jsonwebtoken with default export
const mockBcrypt = { compare: jest.fn() };
const mockJwt = { sign: jest.fn(() => 'token') };

jest.unstable_mockModule('bcryptjs', () => ({ default: mockBcrypt }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: mockJwt }));

import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'testsecret';

// Mocks for User, Employee, Invitation, sendEmail, etc.
const mockUser = { findOne: jest.fn(), create: jest.fn(), findById: jest.fn(), save: jest.fn() };
const mockEmployee = { findOne: jest.fn(), findById: jest.fn() };
const mockInvitation = { findOne: jest.fn(), findById: jest.fn(), save: jest.fn() };
const mockSendEmail = jest.fn();
const mockCrypto = { randomBytes: jest.fn(() => ({ toString: () => 'token' })), createHash: jest.fn(() => ({ update: () => ({ digest: () => 'hashed' }) })) };

const mockReq = (body = {}, user = {}, params = {}) => ({ body, user, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
};

// Helper for chainable .select() mocks
function mockSelect(result) {
  return { select: jest.fn().mockReturnValue(Promise.resolve(result)) };
}

let controller;
beforeAll(async () => {
  // Dynamically import after mocks are set up
  const authControllerFactory = (await import('../../../server/controllers/authController.js')).default;
  controller = authControllerFactory({
    User: mockUser,
    Employee: mockEmployee,
    Invitation: mockInvitation,
    sendEmail: mockSendEmail,
    jwt: mockJwt,
    bcrypt: mockBcrypt,
    crypto: mockCrypto,
  });
});
beforeEach(() => {
  Object.values(mockUser).forEach(fn => fn.mockReset && fn.mockReset());
  Object.values(mockEmployee).forEach(fn => fn.mockReset && fn.mockReset());
  Object.values(mockInvitation).forEach(fn => fn.mockReset && fn.mockReset());
  mockSendEmail.mockReset();
  mockJwt.sign.mockClear();
  mockBcrypt.compare.mockReset();
  mockCrypto.randomBytes.mockClear();
  mockCrypto.createHash.mockClear();
});
afterEach(() => { jest.clearAllMocks(); });

it('should return 400 if required fields are missing (registerUser)', async () => {
  const req = mockReq({ name: '', email: '', password: '', role: '' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 400 for invalid email (registerUser)', async () => {
  const req = mockReq({ name: 'A', email: 'bad', password: '123456', role: 'employer' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 400 for short password (registerUser)', async () => {
  const req = mockReq({ name: 'A', email: 'a@b.com', password: '123', role: 'employer' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 400 for invalid role (registerUser)', async () => {
  const req = mockReq({ name: 'A', email: 'a@b.com', password: '123456', role: 'invalid' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 400 if user exists (registerUser)', async () => {
  mockUser.findOne.mockResolvedValueOnce({});
  const req = mockReq({ name: 'A', email: 'a@b.com', password: '123456', role: 'employer' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should register user and return 201 (registerUser)', async () => {
  mockUser.findOne.mockResolvedValueOnce(null);
  mockUser.create.mockResolvedValueOnce({ _id: '1', name: 'A', email: 'a@b.com', role: 'employer', country: '', phoneNumber: '', companyName: '' });
  const req = mockReq({ name: 'A', email: 'a@b.com', password: '123456', role: 'employer' });
  const res = mockRes();
  await controller.registerUser(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), user: expect.any(Object) }));
});
it('should return 400 if missing fields (loginUser)', async () => {
  const req = mockReq({ email: '', password: '' });
  const res = mockRes();
  await controller.loginUser(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 401 for invalid credentials (loginUser)', async () => {
  mockUser.findOne.mockResolvedValueOnce(null);
  const req = mockReq({ email: 'a@b.com', password: 'wrong' });
  const res = mockRes();
  await controller.loginUser(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

it('should return 400 if missing fields (changePassword)', async () => {
  const req = mockReq({ currentPassword: '', newPassword: '' });
  const res = mockRes();
  await controller.changePassword(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 400 for short new password (changePassword)', async () => {
  const req = mockReq({ currentPassword: 'old', newPassword: '123' });
  const res = mockRes();
  await controller.changePassword(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should return 404 if user not found (changePassword)', async () => {
  mockUser.findById = jest.fn().mockResolvedValueOnce(null);
  const req = mockReq({ currentPassword: 'old', newPassword: '123456' });
  const res = mockRes();
  await controller.changePassword(req, res);
  expect(res.status).toHaveBeenCalledWith(404);
});
it('should return 401 if current password is wrong (changePassword)', async () => {
  mockUser.findById = jest.fn().mockResolvedValueOnce({ password: 'hashed' });
  mockBcrypt.compare.mockResolvedValueOnce(false);
  const req = mockReq({ currentPassword: 'old', newPassword: '123456' });
  const res = mockRes();
  await controller.changePassword(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
});
// --- Additional tests for full coverage ---
it('should handle forgotPassword with missing email', async () => {
  const req = mockReq({});
  const res = mockRes();
  await controller.forgotPassword(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should handle forgotPassword for non-existent user', async () => {
  mockUser.findOne.mockResolvedValueOnce(null);
  const req = mockReq({ email: 'notfound@b.com' });
  const res = mockRes();
  await controller.forgotPassword(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
});
it('should handle forgotPassword and send email', async () => {
  mockUser.findOne.mockResolvedValueOnce({ email: 'a@b.com', save: jest.fn().mockResolvedValue(), passwordResetToken: undefined, passwordResetExpires: undefined });
  mockSendEmail.mockResolvedValueOnce();
  const req = mockReq({ email: 'a@b.com' });
  const res = mockRes();
  await controller.forgotPassword(req, res);
  expect(mockSendEmail).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
});
it('should handle forgotPassword email send error', async () => {
  const save = jest.fn().mockResolvedValue();
  mockUser.findOne.mockResolvedValueOnce({ email: 'a@b.com', save, passwordResetToken: undefined, passwordResetExpires: undefined });
  mockSendEmail.mockRejectedValueOnce(new Error('fail'));
  const req = mockReq({ email: 'a@b.com' });
  const res = mockRes();
  await controller.forgotPassword(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
});
it('should handle resetPassword with invalid new password', async () => {
  const req = mockReq({ newPassword: '123' }, {}, { token: 'tok' });
  const res = mockRes();
  await controller.resetPassword(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should handle resetPassword with invalid/expired token', async () => {
  mockUser.findOne.mockResolvedValueOnce(null);
  const req = mockReq({ newPassword: '123456' }, {}, { token: 'tok' });
  const res = mockRes();
  await controller.resetPassword(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should handle resetPassword success', async () => {
  const save = jest.fn().mockResolvedValue();
  mockUser.findOne.mockResolvedValueOnce({ save });
  const req = mockReq({ newPassword: '123456' }, {}, { token: 'tok' });
  const res = mockRes();
  await controller.resetPassword(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
});
it('should handle checkUserExists with missing email', async () => {
  const req = mockReq({});
  const res = mockRes();
  await controller.checkUserExists(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should handle checkUserExists user found', async () => {
  mockUser.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ _id: '1', name: 'A', email: 'a@b.com', role: 'employer' }) });
  const req = mockReq({ email: 'a@b.com' });
  const res = mockRes();
  await controller.checkUserExists(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ exists: true }));
});
it('should handle checkUserExists user not found', async () => {
  mockUser.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce(null) });
  const req = mockReq({ email: 'notfound@b.com' });
  const res = mockRes();
  await controller.checkUserExists(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ exists: false }));
});
it('should handle checkProspectiveEmployee with missing email', async () => {
  const req = mockReq({});
  const res = mockRes();
  await controller.checkProspectiveEmployee(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
it('should handle checkProspectiveEmployee available', async () => {
  mockUser.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce(null) });
  const req = mockReq({ email: 'new@b.com' });
  const res = mockRes();
  await controller.checkProspectiveEmployee(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ canProceed: true, userExists: false }));
});
it('should handle checkProspectiveEmployee already employee', async () => {
  mockUser.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ _id: '1' }) });
  mockEmployee.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ _id: '2', employerId: 'emp1' }) });
  const req = mockReq({ email: 'emp@b.com' });
  const res = mockRes();
  await controller.checkProspectiveEmployee(req, res);
  expect(res.status).toHaveBeenCalledWith(409);
});
it('should handle checkProspectiveEmployee already registered', async () => {
  mockUser.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ _id: '1' }) });
  mockEmployee.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce(null) });
  const req = mockReq({ email: 'reg@b.com' });
  const res = mockRes();
  await controller.checkProspectiveEmployee(req, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ canProceed: true, userExists: true }));
});

