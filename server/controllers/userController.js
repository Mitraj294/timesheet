import User from "../models/User.js";

// @desc    Update user profile (name, email, country, phone, company)
// @route   PUT /api/users/profile
// @access  Private (Requires authentication)
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From protect middleware
        const { name, email, country, phoneNumber, companyName } = req.body;

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
        // Update optional fields if provided
        if (country !== undefined) user.country = country; // Allow setting to empty string
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
        if (companyName !== undefined && user.role === 'employer') { // Only allow company name update for employers
            user.companyName = companyName;
        }

        const updatedUser = await user.save(); // pre-save hook in model won't re-hash password unless it's changed

        // Respond with updated, non-sensitive user data
        res.json({
            _id: updatedUser._id, // Consistent with other controllers
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            country: updatedUser.country,
            phoneNumber: updatedUser.phoneNumber,
            companyName: updatedUser.companyName,
            // Do NOT send back password or token here
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Server error during profile update." });
    }
};