import User from "../models/User.js";

// @desc    Update user profile (name, email)
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From protect middleware
        const { name, email } = req.body;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required." });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if email is being changed and if the new email is already taken by another user
        if (email !== user.email) {
            const emailExists = await User.findOne({ email: email });
            // Ensure the found user isn't the current user themselves
            if (emailExists && emailExists._id.toString() !== userId) {
                return res.status(400).json({ message: "Email already in use by another account." });
            }
        }

        // Update user fields
        user.name = name;
        user.email = email;

        const updatedUser = await user.save(); // pre-save hook in model won't re-hash password unless it's changed

        // Respond with updated, non-sensitive user data
        res.json({
            id: updatedUser._id, // or id
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            // Do NOT send back password or token here
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Server error during profile update." });
    }
};