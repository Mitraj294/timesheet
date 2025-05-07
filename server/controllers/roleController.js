import Role from '../models/Role.js';
import { DateTime } from 'luxon';

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (e.g., Employer/Employee)
export const createRole = async (req, res) => {
  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;

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
    res.status(500).json({ message: 'Server error while creating role' });
  }
};

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (e.g., Employer/Employee)
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('assignedEmployees', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(roles);
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ message: 'Server error while fetching roles' });
  }
};

// @desc    Get a single role by ID
// @route   GET /api/roles/:id
// @access  Private (e.g., Employer/Employee)
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(200).json(role);
  } catch (err) {
    console.error('Error fetching role:', err);
    res.status(500).json({ message: 'Server error while fetching role' });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private (e.g., Employer/Employee)
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    // Only extract fields that might be updated.
    // findByIdAndUpdate will handle partial updates.
    const updateData = req.body;

    // Use findByIdAndUpdate for cleaner partial updates
    // { new: true } returns the updated document
    // { runValidators: true } ensures schema validation runs on the update
    const updatedRole = await Role.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true, // Make sure validation runs!
    });

    if (!updatedRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', role: updatedRole });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: 'Server error while updating role' });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private (e.g., Employer/Employee)
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Role.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ message: 'Server error while deleting role' });
  }
};


// @desc    Delete a specific schedule entry from a role
// @route   DELETE /api/roles/:roleId/schedule/:scheduleId
// @access  Private (e.g., Employer/Employee)
export const deleteScheduleFromRole = async (req, res) => {
  const { roleId, scheduleId } = req.params;

  try {
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      {
        $pull: {
          schedule: { _id: scheduleId }, // removes the schedule with this _id
        },
      },
      { new: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({ message: 'Schedule removed from role', role: updatedRole });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: 'Server error while deleting schedule from role' });
  }
};

// @desc    Delete schedules by date range (Note: Operates on Schedule model directly)
// @route   DELETE /api/schedules/by-date-range (Or a more role-specific route if applicable)
// @access  Private (e.g., Employer/Employee)
export const deleteByDateRange = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const result = await Schedule.deleteMany({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    res.status(200).json({
      message: `${result.deletedCount} schedules deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting schedules by date range:', error);
    res.status(500).json({ message: 'Server error while deleting schedules' });
  }
};