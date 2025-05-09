import Role from '../models/Role.js';
import Employee from '../models/Employee.js'; // Assuming Employee model for getRoles logic
import { DateTime } from 'luxon';

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (Employer)
export const createRole = async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Forbidden: Only employers can create roles.' });
  }

  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;
    const employerId = req.user._id;

    // TODO: Add validation to ensure assignedEmployees belong to this employerId

    // Convert from local time to UTC before storing
    const schedulesArray = schedule.map((sch) => ({
      day: sch.day,
      startTime: sch.startTime
        ? DateTime.fromFormat(sch.startTime, 'HH:mm', {
            zone: sch.timezone || 'UTC', 
          }).toUTC().toFormat('HH:mm')
        : '',
      endTime: sch.endTime
        ? DateTime.fromFormat(sch.endTime, 'HH:mm', {
            zone: sch.timezone || 'UTC',
          }).toUTC().toFormat('HH:mm')
        : '',
    }));

    const newRole = new Role({
      employerId,
      roleName,
      roleDescription,
      color,
      assignedEmployees,
      schedule: schedulesArray,
    });

    await newRole.save();
    res.status(201).json({ message: 'Role created successfully', role: newRole });
  } catch (err) {
    console.error('Error creating role:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while creating role: ' + err.message });
  }
};

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Employer, Employee)
export const getRoles = async (req, res) => {
  try {
    let targetEmployerId;

    if (req.user.role === 'employer') {
      targetEmployerId = req.user._id;
    } else if (req.user.role === 'employee') {
      // Find the employee record using their User ID to get their employer's ID
      // Assumes Employee model has `userId` (linking to User._id) and `employerId` (linking to employer's User._id)
      const employeeRecord = await Employee.findOne({ userId: req.user._id }).select('employerId').lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        return res.status(404).json({ message: 'Employee record or associated employer not found for fetching roles.' });
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      return res.status(403).json({ message: 'Forbidden: User role cannot access roles.' });
    }

    if (!targetEmployerId) {
        return res.status(400).json({ message: 'Could not determine employer for fetching roles.' });
    }

    const roles = await Role.find({ employerId: targetEmployerId })
      .populate('assignedEmployees', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(roles);
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ message: 'Server error while fetching roles: ' + err.message });
  }
};

// @desc    Get a single role by ID
// @route   GET /api/roles/:id
// @access  Private (e.g., Employer/Employee)
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('assignedEmployees', 'name');
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    let canAccess = false;
    if (req.user.role === 'employer' && role.employerId.toString() === req.user._id.toString()) {
      canAccess = true;
    } else if (req.user.role === 'employee') {
      const employeeRecord = await Employee.findOne({ userId: req.user._id }).select('employerId').lean();
      if (employeeRecord && employeeRecord.employerId && role.employerId.toString() === employeeRecord.employerId.toString()) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this role.' });
    }

    res.status(200).json(role);
  } catch (err) {
    console.error('Error fetching role:', err);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Role not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while fetching role: ' + err.message });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private (Employer)
export const updateRole = async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Forbidden: Only employers can update roles.' });
  }

  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const updateData = req.body;

    // Prevent employerId from being changed
    if (updateData.employerId) {
      delete updateData.employerId;
    }
    // TODO: Add validation to ensure assignedEmployees in updateData belong to this employerId

    const updatedRole = await Role.findOneAndUpdate(
      { _id: id, employerId: employerId }, // Ensure role belongs to the employer
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedEmployees', 'name');

    if (!updatedRole) {
      // Check if role exists but doesn't belong to user, or if it doesn't exist at all
      const roleExists = await Role.findById(id);
      if (roleExists) {
        return res.status(403).json({ message: 'Forbidden: You do not own this role.' });
      }
      return res.status(404).json({ message: 'Role not found.' });
    }

    res.status(200).json({ message: 'Role updated successfully', role: updatedRole });
  } catch (err) {
    console.error('Error updating role:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
    }
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Role not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while updating role: ' + err.message });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private (Employer)
export const deleteRole = async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Forbidden: Only employers can delete roles.' });
  }
  try {
    const { id } = req.params;
    const employerId = req.user._id;

    const deletedRole = await Role.findOneAndDelete({ _id: id, employerId: employerId });

    if (!deletedRole) {
      const roleExists = await Role.findById(id);
      if (roleExists) {
        return res.status(403).json({ message: 'Forbidden: You do not own this role.' });
      }
      return res.status(404).json({ message: 'Role not found.' });
    }
    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (err) {
    console.error('Error deleting role:', err);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Role not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while deleting role: ' + err.message });
  }
};


// @desc    Delete a specific schedule entry from a role
// @route   DELETE /api/roles/:roleId/schedule/:scheduleId
// @access  Private (e.g., Employer/Employee)
// @access  Private (Employer)
export const deleteScheduleFromRole = async (req, res) => {
  const { roleId, scheduleId } = req.params;
  const employerId = req.user._id;

  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Forbidden: Only employers can modify role schedules.' });
  }

  try {
    // First, verify the role belongs to the employer
    const role = await Role.findOne({ _id: roleId, employerId: employerId });
    if (!role) {
      return res.status(403).json({ message: 'Forbidden: Role not found or you do not own this role.' });
    }

    // If role is owned, proceed to pull the schedule entry
    const updatedRole = await Role.findByIdAndUpdate(
      // roleId, // Already confirmed ownership
      { _id: roleId, employerId: employerId }, // Explicitly use employerId here too for safety
      {
        $pull: {
          schedule: { _id: scheduleId }, // removes the schedule with this _id
        },
      },
      { new: true }
    );

    if (!updatedRole) {
      // This case should ideally be covered by the role check above.
      // If it reaches here, it might mean the role was deleted between checks, or scheduleId wasn't found (which $pull handles gracefully)
      return res.status(404).json({ message: 'Role not found or schedule entry not modified.' });
    }

    res.status(200).json({ message: 'Schedule entry removed from role', role: updatedRole });
  } catch (err) {
    console.error('Error deleting schedule entry from role:', err);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Resource not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while deleting schedule entry from role: ' + err.message });
  }
};

// @desc    Delete schedules by date range (Note: Operates on Schedule model directly)
// @route   DELETE /api/schedules/by-date-range (Or a more role-specific route if applicable)
// @access  Private (Employer)
export const deleteByDateRange = async (req, res) => {
  const { startDate, endDate } = req.body;
  const employerId = req.user._id;

  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Forbidden: Only employers can delete schedules by date range.' });
  }

  try {
    const result = await Schedule.deleteMany({
      employerId: employerId, // Filter by employerId
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    res.status(200).json({
      message: `${result.deletedCount} schedules deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting schedules by date range:', error);
    res.status(500).json({ message: 'Server error while deleting schedules: ' + error.message });
  }
};