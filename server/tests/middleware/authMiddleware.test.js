import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

import jwtImport from 'jsonwebtoken';
import User from '../../models/User.js';
import * as authMiddleware from '../../middleware/authMiddleware.js';

const mockReq = (headers = {}) => ({ headers });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('authMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof jwtImport.verify !== 'function' || !jwtImport.verify._isMockFunction) {
      jwtImport.verify = jest.fn();
    }
    if (typeof User.findById !== 'function' || !User.findById._isMockFunction) {
      User.findById = jest.fn();
    }
  });

  describe('protect', () => {
    it('calls next and attaches user for valid token', async () => {
      jwtImport.verify.mockImplementation(() => ({ id: '123', role: 'employer' }));
      // Simulate mongoose's .select() chain
      const fakeUser = { _id: '123', role: 'employer' };
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(Promise.resolve(fakeUser)),
      });
      const req = mockReq({ authorization: 'Bearer validtoken' });
      req.user = undefined;
      const res = mockRes();
      await authMiddleware.protect(req, res, mockNext);
      expect(jwtImport.verify).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith('123');
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toEqual(fakeUser);
    });

    it('attaches employerId for employee', async () => {
      jwtImport.verify.mockImplementation(() => ({ id: '456', role: 'employee', employerId: 'empid' }));
      const fakeUser = { _id: '456', role: 'employee' };
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(Promise.resolve(fakeUser)),
      });
      const req = mockReq({ authorization: 'Bearer validtoken' });
      req.user = undefined;
      const res = mockRes();
      await authMiddleware.protect(req, res, mockNext);
      expect(req.user.employerId).toBe('empid');
      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 401 if no token', async () => {
      const req = mockReq({});
      const res = mockRes();
      await authMiddleware.protect(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 if token invalid', async () => {
      jwtImport.verify.mockImplementation(() => { throw new Error('bad token'); });
      const req = mockReq({ authorization: 'Bearer badtoken' });
      const res = mockRes();
      await authMiddleware.protect(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 if user not found', async () => {
      jwtImport.verify.mockImplementation(() => ({ id: 'notfound' }));
      // Simulate .select() returning null
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(Promise.resolve(null)),
      });
      const req = mockReq({ authorization: 'Bearer validtoken' });
      const res = mockRes();
      await authMiddleware.protect(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      // The middleware returns "Not authorized, user not found" if user not found
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, user not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('employerOnly', () => {
    it('calls next if user is employer', () => {
      const req = { user: { role: 'employer' } };
      const res = mockRes();
      authMiddleware.employerOnly(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 403 if user is not employer', () => {
      const req = { user: { role: 'employee' } };
      const res = mockRes();
      authMiddleware.employerOnly(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied: Employer role required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 403 if no user', () => {
      const req = {};
      const res = mockRes();
      authMiddleware.employerOnly(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied: Employer role required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
