import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../../server/models/User.js';

describe('User Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/user-model-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should require name, email, password, and role', async () => {
    const user = new User({});
    let err;
    try {
      await user.validate();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.role).toBeUndefined(); // role has default
  });

  it('should hash password before saving', async () => {
    const plainPassword = 'mypassword';
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: plainPassword,
      role: 'employee',
    });
    await user.save();
    expect(user.password).not.toBe(plainPassword);
    expect(await bcrypt.compare(plainPassword, user.password)).toBe(true);
  });

  it('should not rehash password if not modified', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test2@example.com',
      password: 'mypassword',
      role: 'employee',
    });
    await user.save();
    const originalHash = user.password;
    user.name = 'Updated Name';
    await user.save();
    expect(user.password).toBe(originalHash);
  });

  it('should compare passwords correctly with matchPassword', async () => {
    const plainPassword = 'secret123';
    const user = new User({
      name: 'Test User',
      email: 'test3@example.com',
      password: plainPassword,
      role: 'employee',
    });
    await user.save();
    expect(await user.matchPassword(plainPassword)).toBe(true);
    expect(await user.matchPassword('wrong')).toBe(false);
  });

  it('should enforce unique email', async () => {
    const user1 = new User({
      name: 'User1',
      email: 'unique@example.com',
      password: 'pass1',
      role: 'employee',
    });
    const user2 = new User({
      name: 'User2',
      email: 'unique@example.com',
      password: 'pass2',
      role: 'employer',
    });
    await user1.save();
    let err;
    try {
      await user2.save();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Duplicate key error
  });

  it('should allow optional fields and set defaults', async () => {
    const user = new User({
      name: 'Test User',
      email: 'optional@example.com',
      password: 'pass',
      role: 'admin',
    });
    await user.save();
    expect(user.country).toBeUndefined();
    expect(user.phoneNumber).toBeUndefined();
    expect(user.companyName).toBeUndefined();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should only allow valid roles', async () => {
    const user = new User({
      name: 'Test User',
      email: 'rolefail@example.com',
      password: 'pass',
      role: 'notarole',
    });
    let err;
    try {
      await user.validate();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });
});
