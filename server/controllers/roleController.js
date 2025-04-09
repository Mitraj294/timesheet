import Role from '../models/Role.js';
import { DateTime } from 'luxon';

export const createRole = async (req, res) => {
  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;

    // Convert schedule times to UTC.
    // We assume schedule is an array like: [{ day: "2025-04-07", startTime: "09:00", endTime: "17:00" }, ...]
    const schedulesArray = schedule.map((sch) => ({
      day: sch.day, 
      startTime: sch.startTime
        ? DateTime.fromISO(`1970-01-01T${sch.startTime}`, { zone: 'local' }).toUTC().toFormat('HH:mm')
        : '',
      endTime: sch.endTime
        ? DateTime.fromISO(`1970-01-01T${sch.endTime}`, { zone: 'local' }).toUTC().toFormat('HH:mm')
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
}

// controllers/roleController.js
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
// server/controllers/roleController.js
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
