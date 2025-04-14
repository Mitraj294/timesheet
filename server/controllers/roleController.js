import Role from '../models/Role.js';
import { DateTime } from 'luxon';

export const createRole = async (req, res) => {
  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;

    // Convert from local time to UTC before storing
    const schedulesArray = schedule.map((sch) => ({
      day: sch.day,
      startTime: sch.startTime
        ? DateTime.fromFormat(sch.startTime, 'HH:mm', {
            zone: sch.timezone || 'UTC', // assume frontend sends correct tz like "Asia/Kolkata"
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

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(200).json(role);
  } catch (err) {
    console.error('Error fetching role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    role.roleName = roleName;
    role.roleDescription = roleDescription;
    role.color = color;
    role.assignedEmployees = assignedEmployees;
    role.schedule = schedule;

    await role.save();
    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: 'Server error while updating role' });
  }
};

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


// DELETE /api/roles/:roleId/schedule/:scheduleId
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