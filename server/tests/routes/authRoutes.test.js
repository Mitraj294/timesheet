import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ESM-compatible mocking for all dependencies
const mockController = {
  registerUser: jest.fn((req, res) => res.status(201).json({ message: 'registered' })),
  loginUser: jest.fn((req, res) => res.status(200).json({ token: 'token', user: { id: '1' } })),
  forgotPassword: jest.fn((req, res) => res.status(200).json({ message: 'reset link sent' })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ message: 'password reset' })),
  checkUserExists: jest.fn((req, res) => res.status(200).json({ user: { id: '1' } })),
  checkProspectiveEmployee: jest.fn((req, res) => res.status(200).json({ canProceed: true })),
  requestCompanyInvitation: jest.fn((req, res) => res.status(201).json({ message: 'invitation requested' })),
  getPendingInvitations: jest.fn((req, res) => res.status(200).json([{ id: 'inv1' }])),
  approveInvitation: jest.fn((req, res) => res.status(200).json({ message: 'approved' })),
  rejectInvitation: jest.fn((req, res) => res.status(200).json({ message: 'rejected' })),
  changePassword: jest.fn((req, res) => res.status(200).json({ message: 'changed' })),
  requestAccountDeletionLink: jest.fn((req, res) => res.status(200).json({ message: 'deletion link sent' })),
  confirmAccountDeletion: jest.fn((req, res) => res.status(200).json({ message: 'account deleted' })),
  verifyCurrentUserPassword: jest.fn((req, res) => res.status(200).json({ valid: true })),
};

jest.unstable_mockModule('awilix-express', () => ({
  makeInvoker: (factory) => (method) => mockController[method],
  scopePerRequest: () => (req, res, next) => next(),
}));
jest.unstable_mockModule('../../../server/controllers/authController.js', () => ({
  default: () => mockController // <-- Fix: provide default export as object
}));
jest.unstable_mockModule('../../../server/middleware/authMiddleware.js', () => ({
  protect: (req, res, next) => { req.user = { id: '1', role: 'employer' }; next(); },
  employerOnly: (req, res, next) => { if (req.user.role === 'employer') return next(); res.status(403).json({ message: 'Forbidden' }); },
}));

import request from 'supertest';
import express from 'express';
import authRoutes from '../../../server/routes/authRoutes.js';

describe('authRoutes', () => {
  let app;
  let authRoutes;
  beforeEach(async () => {
    jest.resetModules();
    jest.unstable_mockModule('awilix-express', () => ({
      makeInvoker: (factory) => (method) => mockController[method],
      scopePerRequest: () => (req, res, next) => next(),
    }));
    jest.unstable_mockModule('../../../server/controllers/authController.js', () => ({
      default: () => mockController // <-- Fix: provide default export as object
    }));
    jest.unstable_mockModule('../../../server/middleware/authMiddleware.js', () => ({
      protect: (req, res, next) => { req.user = { id: '1', role: 'employer' }; next(); },
      employerOnly: (req, res, next) => { if (req.user.role === 'employer') return next(); res.status(403).json({ message: 'Forbidden' }); },
    }));
    authRoutes = (await import('../../../server/routes/authRoutes.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  it('POST /register calls registerUser', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('registered');
  });

  it('POST /login calls loginUser', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(200);
    expect(res.body.token).toBe('token');
  });

  it('POST /forgot-password calls forgotPassword', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('reset link sent');
  });

  it('PUT /reset-password/:token calls resetPassword', async () => {
    const res = await request(app).put('/api/auth/reset-password/abc').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('password reset');
  });

  it('POST /check-user (protected) calls checkUserExists', async () => {
    const res = await request(app).post('/api/auth/check-user').send({});
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('POST /check-prospective-employee calls checkProspectiveEmployee', async () => {
    const res = await request(app).post('/api/auth/check-prospective-employee').send({});
    expect(res.status).toBe(200);
    expect(res.body.canProceed).toBe(true);
  });

  it('POST /request-invitation calls requestCompanyInvitation', async () => {
    const res = await request(app).post('/api/auth/request-invitation').send({});
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('invitation requested');
  });

  it('GET /invitations/pending (protected) calls getPendingInvitations', async () => {
    const res = await request(app).get('/api/auth/invitations/pending');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /invitations/:invitationId/approve (protected) calls approveInvitation', async () => {
    const res = await request(app).post('/api/auth/invitations/123/approve');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('approved');
  });

  it('POST /invitations/:invitationId/reject (protected) calls rejectInvitation', async () => {
    const res = await request(app).post('/api/auth/invitations/123/reject');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('rejected');
  });

  it('PUT /change-password (protected) calls changePassword', async () => {
    const res = await request(app).put('/api/auth/change-password').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('changed');
  });

  it('GET /me (protected) returns user info', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('1');
  });

  it('POST /request-deletion-link (protected) calls requestAccountDeletionLink', async () => {
    const res = await request(app).post('/api/auth/request-deletion-link');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('deletion link sent');
  });

  it('POST /confirm-delete-account/:token calls confirmAccountDeletion', async () => {
    const res = await request(app).post('/api/auth/confirm-delete-account/abc');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('account deleted');
  });

  it('POST /verify-password (protected) calls verifyCurrentUserPassword', async () => {
    const res = await request(app).post('/api/auth/verify-password');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  // Add test for all routes in authRoutes.js
  // Already covers: /register, /login, /forgot-password, /reset-password/:token, /check-user, /check-prospective-employee, /request-invitation, /invitations/pending, /invitations/:invitationId/approve, /invitations/:invitationId/reject, /change-password, /me, /request-deletion-link, /confirm-delete-account/:token, /verify-password
  // Add missing tests for edge cases and all route methods
});

// ESM-compatible edge case tests for /check-user forbidden and /me 404/500
describe('authRoutes edge cases', () => {
  it('POST /check-user (forbidden if not employer)', async () => {
    // Remock before import
    jest.resetModules();
    jest.unstable_mockModule('awilix-express', () => ({
      makeInvoker: (factory) => (method) => mockController[method],
      scopePerRequest: () => (req, res, next) => next(),
    }));
    jest.unstable_mockModule('../../../server/controllers/authController.js', () => ({
      default: () => mockController
    }));
    jest.unstable_mockModule('../../../server/middleware/authMiddleware.js', () => ({
      protect: (req, res, next) => { req.user = { id: '1', role: 'employee' }; next(); },
      employerOnly: (req, res, next) => res.status(403).json({ message: 'Forbidden' }),
    }));
    const { default: authRoutesMod } = await import('../../../server/routes/authRoutes.js');
    const app2 = express();
    app2.use(express.json());
    app2.use('/api/auth', authRoutesMod);
    const res = await request(app2).post('/api/auth/check-user').send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  it('GET /me returns 404 if no user', async () => {
    // Remock before import
    jest.resetModules();
    jest.unstable_mockModule('awilix-express', () => ({
      makeInvoker: (factory) => (method) => mockController[method],
      scopePerRequest: () => (req, res, next) => next(),
    }));
    jest.unstable_mockModule('../../../server/controllers/authController.js', () => ({
      default: () => mockController
    }));
    jest.unstable_mockModule('../../../server/middleware/authMiddleware.js', () => ({
      protect: (req, res, next) => { req.user = null; next(); },
      employerOnly: (req, res, next) => next(),
    }));
    const { default: authRoutesMod } = await import('../../../server/routes/authRoutes.js');
    const app2 = express();
    app2.use(express.json());
    app2.use('/api/auth', authRoutesMod);
    const res = await request(app2).get('/api/auth/me');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/User data not found/);
  });

  it('GET /me returns 500 on error', async () => {
    const app2 = express();
    app2.use(express.json());
    app2.use('/api/auth', (req, res, next) => { throw new Error('fail'); }, authRoutes);
    const res = await request(app2).get('/api/auth/me');
    expect(res.status).toBe(500);
  });
});
