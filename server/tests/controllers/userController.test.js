// Basic test file for userController
import { jest } from '@jest/globals';
import * as userController from '../../../server/controllers/userController.js';

describe('userController', () => {
  let req, res, User;

  beforeEach(() => {
    req = { user: { id: 'user1', role: 'employer' }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    User = { findById: jest.fn(), findOne: jest.fn() };
    jest.clearAllMocks();
    userController.User = User;
  });

  it('should return 400 if name or email missing', async () => {
    req.body = { name: '', email: '' };
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 if user not found', async () => {
    req.body = { name: 'A', email: 'a@b.com' };
    User.findById.mockResolvedValueOnce(null);
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 400 if email already in use', async () => {
    req.body = { name: 'A', email: 'new@b.com' };
    User.findById.mockResolvedValueOnce({ _id: 'user1', email: 'old@b.com', role: 'employer', save: jest.fn() });
    User.findOne.mockResolvedValueOnce({ _id: 'user2' });
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should update and return user', async () => {
    const save = jest.fn().mockResolvedValue({ _id: 'user1', name: 'A', email: 'a@b.com', role: 'employer', country: 'IN', phoneNumber: '123', companyName: 'C' });
    req.body = { name: 'A', email: 'a@b.com', country: 'IN', phoneNumber: '123', companyName: 'C' };
    User.findById.mockResolvedValueOnce({ _id: 'user1', email: 'a@b.com', role: 'employer', save });
    User.findOne.mockResolvedValueOnce(null);
    await userController.updateUserProfile(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'A', email: 'a@b.com', companyName: 'C' }));
  });

  it('should handle server error', async () => {
    req.body = { name: 'A', email: 'a@b.com' };
    User.findById.mockRejectedValueOnce(new Error('fail'));
    await userController.updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
