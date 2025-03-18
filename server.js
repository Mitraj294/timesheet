import dotenv from 'dotenv';
dotenv.config();  

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(' MongoDB Connection Error:', err));

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);

// Basic API Route
app.get('/', (req, res) => {
  res.send('TimeSheet Backend is Running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
