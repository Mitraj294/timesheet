// Integration test for employeeController using mongodb-memory-server
import { jest, expect, describe, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Employee from '../../models/Employee.js';
import * as employeeController from '../../controllers/employeeController.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean all collections before each test
  await Promise.all(Object.values(mongoose.connection.collections).map(col => col.deleteMany({})));
});

describe('employeeController integration', () => {
  it('should add employee successfully', async () => {
    const employerId = new mongoose.Types.ObjectId();
    const req = { body: { name: 'A', email: 'a@b.com', employeeCode: 'E1', wage: 10 }, user: { id: employerId } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await employeeController.addEmployee(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'A' }));
    const dbEmployee = await Employee.findOne({ email: 'a@b.com' });
    expect(dbEmployee).not.toBeNull();
  });
  // Add more integration tests for other controller methods as needed
});
