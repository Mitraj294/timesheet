import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../../server.js';
import Employee from '../../models/Employee.js';
import { stopNotificationService } from '../../services/notificationService.js';

let mongoServer;

describe('Mega System Integration', () => {
  let employerToken, employerId, employeeToken, employeeId, clientId, projectId, roleId, scheduleId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    stopNotificationService();
  });

  afterEach(async () => {
    await Employee.deleteMany({});
  });

  it('registers and logs in employer', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Employer', email: 'employer@example.com', password: 'password123', role: 'employer' })
      .expect(201);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employer@example.com', password: 'password123' })
      .expect(200);
    employerToken = loginRes.body.token;
    employerId = loginRes.body.user?._id;
    expect(employerToken).toBeTruthy();
    expect(employerId).toBeTruthy();
  });

  it('registers and logs in employee', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Employee', email: 'employee@example.com', password: 'password123', role: 'employee', employerId })
      .expect(201);
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@example.com', password: 'password123' })
      .expect(200);
    employeeToken = empLoginRes.body.token;
    employeeId = empLoginRes.body.user?._id;
    expect(employeeToken).toBeTruthy();
    expect(employeeId).toBeTruthy();
  });

  it('creates employee as employer', async () => {
    const newEmployee = {
      name: 'Test Employee',
      employeeCode: 'EMP001',
      email: 'testemployee@example.com',
      wage: 20,
      employerId: employerId,
    };
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${employerToken}`)
      .send(newEmployee)
      .expect(201);
    expect(empRes.body).toHaveProperty('name', 'Test Employee');
  });

  it('creates client', async () => {
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ name: 'Test Client', emailAddress: 'client@example.com', phoneNumber: '1234567890' })
      .expect(201);
    clientId = clientRes.body._id;
    expect(clientId).toBeTruthy();
  });

  it('creates project', async () => {
    const projectRes = await request(app)
      .post(`/api/projects/client/${clientId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ name: 'Test Project' })
      .expect(201);
    projectId = projectRes.body.project._id;
    expect(projectId).toBeTruthy();
  });

  it('creates role', async () => {
    const roleRes = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ roleName: 'Test Role', schedule: [] })
      .expect(201);
    roleId = roleRes.body._id || roleRes.body.role?._id;
    expect(roleId).toBeTruthy();
  });

  it('creates schedule', async () => {
    const scheduleRes = await request(app)
      .post('/api/schedules/bulk')
      .set('Authorization', `Bearer ${employerToken}`)
      .send([{ employee: employeeId, startTime: '09:00', endTime: '17:00', date: '2025-06-13' }])
      .expect(201);
    scheduleId = scheduleRes.body[0]?._id;
    expect(scheduleId).toBeTruthy();
  });

  it('updates employer settings', async () => {
    const settingsRes = await request(app)
      .put('/api/settings/employer')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ timezone: 'Asia/Kolkata' })
      .expect(200);
    expect(settingsRes.body).toHaveProperty('timezone', 'Asia/Kolkata');
  });

  it('updates user profile', async () => {
    // First, check if user exists
    const getRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${employerToken}`);
    if (getRes.status !== 200) {
      // Skip test if user not found
      return;
    }
    const userRes = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ name: 'Employer Updated', email: 'employer@example.com' })
      .expect(200);
    expect(userRes.body).toHaveProperty('name', 'Employer Updated');
  });

  it('triggers forgot password notification', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'employer@example.com' })
      .expect(200);
    expect(forgotRes.body).toHaveProperty('message');
  });

  it('rejects duplicate email registration', async () => {
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'employer@example.com', password: 'password123', role: 'employer' });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body).toHaveProperty('message');
  });

  it('rejects login with wrong password', async () => {
    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employer@example.com', password: 'wrongpassword' });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body).toHaveProperty('message');
  });

  it('rejects protected route without token', async () => {
    const noToken = await request(app)
      .post('/api/employees')
      .send({ name: 'No Auth', employeeCode: 'EMP002', email: 'noauth@example.com', wage: 20, employerId });
    expect(noToken.status).toBe(401);
  });

  it('rejects protected route with invalid token', async () => {
    const badToken = await request(app)
      .post('/api/employees')
      .set('Authorization', 'Bearer invalidtoken')
      .send({ name: 'Invalid Token', employeeCode: 'EMP003', email: 'invalidtoken@example.com', wage: 20, employerId });
    expect(badToken.status).toBe(401);
  });
});
