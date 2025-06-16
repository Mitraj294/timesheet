import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// ESM mocking for User model
const mockUser = { findById: jest.fn(), findOne: jest.fn() };
jest.unstable_mockModule('../../../server/models/User.js', () => ({
  default: mockUser,
}));

let userController;
beforeAll(async () => {
  userController = await import('../../../server/controllers/userController.js');
});

describe('userController', () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: 'user1', role: 'employer' }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockUser.findById.mockReset();
    mockUser.findOne.mockReset();
    jest.clearAllMocks();
  });

  it('should return 400 if name or email missing', async () => {
    req.body = { name: '', email: '' };
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 if user not found', async () => {
    req.body = { name: 'A', email: 'a@b.com' };
    mockUser.findById.mockResolvedValueOnce(null);
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 400 if email already in use', async () => {
    req.body = { name: 'A', email: 'new@b.com' };
    mockUser.findById.mockResolvedValueOnce({ _id: 'user1', email: 'old@b.com', role: 'employer', save: jest.fn() });
    mockUser.findOne.mockResolvedValueOnce({ _id: 'user2' });
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should update and return user', async () => {
    const save = jest.fn().mockResolvedValue({ _id: 'user1', name: 'A', email: 'a@b.com', role: 'employer', country: 'IN', phoneNumber: '123', companyName: 'C' });
    req.body = { name: 'A', email: 'a@b.com', country: 'IN', phoneNumber: '123', companyName: 'C' };
    mockUser.findById.mockResolvedValueOnce({ _id: 'user1', email: 'a@b.com', role: 'employer', save });
    mockUser.findOne.mockResolvedValueOnce(null);
    await userController.updateUserProfile(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'A', email: 'a@b.com', companyName: 'C' }));
  });

  it('should handle server error', async () => {
    req.body = { name: 'A', email: 'a@b.com' };
    mockUser.findById.mockRejectedValueOnce(new Error('fail'));
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
