import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

describe('userRoutes', () => {
  it('should require authentication for profile update', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .send({ name: 'New Name' });
    expect([401, 404]).toContain(res.statusCode);
  });
});
