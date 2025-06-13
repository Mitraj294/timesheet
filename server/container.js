// Dependency Injection Container setup for awilix
import { createContainer, asClass, asFunction, asValue } from 'awilix';
import { scopePerRequest } from 'awilix-express';
import express from 'express';

// Import your services and models
import Client from './models/Client.js';
import emailService from './services/emailService.js';
import Project from './models/Project.js';
import Employee from './models/Employee.js';
import Timesheet from './models/Timesheet.js';
import mongoose from 'mongoose';
import { generateClientTimesheetReport, sendExcelDownload } from './services/reportService.js';
import User from './models/User.js';
import Invitation from './models/Invitation.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Create the DI container
const container = createContainer();

// Register dependencies
container.register({
  clientModel: asValue(Client),
  emailService: asValue(emailService),
  projectModel: asValue(Project),
  employeeModel: asValue(Employee),
  timesheetModel: asValue(Timesheet),
  mongoose: asValue(mongoose),
  generateClientTimesheetReport: asValue(generateClientTimesheetReport),
  sendExcelDownload: asValue(sendExcelDownload),
});

// Alias for awilix-express to resolve by property name
container.register({
  Client: asValue(Client),
  Employee: asValue(Employee),
  Project: asValue(Project),
  Timesheet: asValue(Timesheet),
  sendEmail: asValue(emailService),
  generateClientTimesheetReport: asValue(generateClientTimesheetReport),
  sendExcelDownload: asValue(sendExcelDownload),
  mongoose: asValue(mongoose),
});

// Register all dependencies needed by the authController
container.register({
  User: asValue(User),
  Employee: asValue(Employee),
  Invitation: asValue(Invitation),
  bcrypt: asValue(bcrypt),
  jwt: asValue(jwt),
  crypto: asValue(crypto),
  sendEmail: asValue(emailService),
});

export default container;
