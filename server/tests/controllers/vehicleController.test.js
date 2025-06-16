// Basic test file for vehicleController
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';

// Mock Vehicle as a constructor function
const mockVehicle = jest.fn(function () {
  return { save: mockVehicle.save };
});
mockVehicle.find = jest.fn();
mockVehicle.findById = jest.fn();
mockVehicle.findOne = jest.fn();
mockVehicle.findByIdAndUpdate = jest.fn();
mockVehicle.findOneAndDelete = jest.fn();
mockVehicle.save = jest.fn();
const mockVehicleReview = {
  findById: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
};
const mockEmployee = {
  findOne: jest.fn(),
  findById: jest.fn(),
};
const mockMongoose = { Types: { ObjectId: { isValid: jest.fn(() => true) } } };

jest.unstable_mockModule('../../../server/models/Vehicle.js', () => ({ default: mockVehicle }));
jest.unstable_mockModule('../../../server/models/VehicleReview.js', () => ({ default: mockVehicleReview }));
jest.unstable_mockModule('../../../server/models/Employee.js', () => ({ default: mockEmployee }));
jest.unstable_mockModule('mongoose', () => ({ default: mockMongoose }));

let vehicleController;
beforeAll(async () => {
  vehicleController = await import('../../../server/controllers/vehicleController.js');
});

describe('vehicleController', () => {
  let req, res;
  beforeEach(() => {
    req = { user: { id: 'employer1', role: 'employer' }, params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockVehicle.mockClear();
    mockVehicle.find.mockReset();
    mockVehicle.findById.mockReset();
    mockVehicle.findOne.mockReset();
    mockVehicle.findByIdAndUpdate.mockReset();
    mockVehicle.findOneAndDelete.mockReset();
    mockVehicle.save.mockReset();
    Object.values(mockVehicleReview).forEach(fn => fn.mockReset && fn.mockReset());
    Object.values(mockEmployee).forEach(fn => fn.mockReset && fn.mockReset());
    mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  describe('getVehicles', () => {
    it('should return vehicles for employer', async () => {
      mockVehicle.find.mockResolvedValueOnce([{ name: 'V1' }]);
      await vehicleController.getVehicles(req, res);
      expect(res.json).toHaveBeenCalledWith([{ name: 'V1' }]);
    });
    it('should return vehicles for employee', async () => {
      req.user.role = 'employee';
      mockEmployee.findOne.mockResolvedValueOnce({ employerId: 'employer1' });
      mockVehicle.find.mockResolvedValueOnce([{ name: 'V2' }]);
      await vehicleController.getVehicles(req, res);
      expect(res.json).toHaveBeenCalledWith([{ name: 'V2' }]);
    });
    it('should return 403 for invalid role', async () => {
      req.user.role = 'other';
      await vehicleController.getVehicles(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
    it('should handle server error', async () => {
      mockVehicle.find.mockRejectedValueOnce(new Error('fail'));
      await vehicleController.getVehicles(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getVehicleById', () => {
    it('should return 400 for invalid id', async () => {
      mockMongoose.Types.ObjectId.isValid.mockReturnValueOnce(false);
      req.params.id = 'bad';
      await vehicleController.getVehicleById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 404 if not found or no access', async () => {
      req.params.id = 'vid';
      mockVehicle.findById.mockResolvedValueOnce({ employerId: 'other' });
      await vehicleController.getVehicleById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    it('should return vehicle for employer', async () => {
      req.params.id = 'vid';
      mockVehicle.findById.mockResolvedValueOnce({ employerId: 'employer1', toString: () => 'employer1' });
      await vehicleController.getVehicleById(req, res);
      expect(res.json).toHaveBeenCalled();
    });
    it('should handle server error', async () => {
      req.params.id = 'vid';
      mockVehicle.findById.mockRejectedValueOnce(new Error('fail'));
      await vehicleController.getVehicleById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createVehicle', () => {
    it('should return 400 if required fields missing', async () => {
      req.body = { name: '', hours: '' };
      await vehicleController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 409 if vehicle exists', async () => {
      req.body = { name: 'V', hours: 1 };
      mockVehicle.findOne.mockResolvedValueOnce({});
      await vehicleController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
    it('should create and return vehicle', async () => {
      req.body = { name: 'V', hours: 1 };
      mockVehicle.findOne.mockResolvedValueOnce(null);
      mockVehicle.save.mockResolvedValueOnce({ name: 'V', hours: 1 });
      mockVehicle.constructor = jest.fn().mockReturnValue({ save: mockVehicle.save });
      await vehicleController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
    it('should handle server error', async () => {
      req.body = { name: 'V', hours: 1 };
      mockVehicle.findOne.mockRejectedValueOnce(new Error('fail'));
      await vehicleController.createVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateVehicle', () => {
    it('should return 400 for invalid id', async () => {
      mockMongoose.Types.ObjectId.isValid.mockReturnValueOnce(false);
      req.params.id = 'bad';
      await vehicleController.updateVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 404 if not found', async () => {
      req.params.id = 'vid';
      mockVehicle.findOne.mockResolvedValueOnce(null);
      await vehicleController.updateVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    it('should update and return vehicle', async () => {
      req.params.id = 'vid';
      req.body = { name: 'V', hours: 2 };
      mockVehicle.findOne.mockResolvedValueOnce({ _id: 'vid', name: 'V' });
      mockVehicle.findByIdAndUpdate.mockResolvedValueOnce({ _id: 'vid', name: 'V', hours: 2 });
      await vehicleController.updateVehicle(req, res);
      expect(res.json).toHaveBeenCalledWith({ _id: 'vid', name: 'V', hours: 2 });
    });
    it('should handle server error', async () => {
      req.params.id = 'vid';
      mockVehicle.findOne.mockRejectedValueOnce(new Error('fail'));
      await vehicleController.updateVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteVehicle', () => {
    it('should return 400 for invalid id', async () => {
      mockMongoose.Types.ObjectId.isValid.mockReturnValueOnce(false);
      req.params.id = 'bad';
      await vehicleController.deleteVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 404 if not found', async () => {
      req.params.id = 'vid';
      mockVehicle.findOneAndDelete.mockResolvedValueOnce(null);
      await vehicleController.deleteVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    it('should delete and return success', async () => {
      req.params.id = 'vid';
      mockVehicle.findOneAndDelete.mockResolvedValueOnce({ _id: 'vid' });
      await vehicleController.deleteVehicle(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vehicle deleted successfully' });
    });
    it('should handle server error', async () => {
      req.params.id = 'vid';
      mockVehicle.findOneAndDelete.mockRejectedValueOnce(new Error('fail'));
      await vehicleController.deleteVehicle(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
