import userData from "../model/user.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwtUtils.js";
import cloudinary from "../Config/cloudinary.js";
import { Readable } from "stream";

import {
    sendWelcomeEmail,
    sendOtpEmail,
    sendForgotPasswordEmail,
} from "../utils/brevoEmail.js";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const normalizeEmail = (email = "") =>
    email.trim().toLowerCase();

const publicUser = (user) => {
    const result = user.toObject
        ? user.toObject()
        : { ...user };

    delete result.password;
    delete result.otp;
    delete result.otpExpires;

    return result;
};

// ==========================================
// CLOUDINARY IMAGE UPLOAD HELPER
// ==========================================

const uploadToCloudinary = async (file) => {
    if (!file) return "";

    const result = await new Promise((resolve, reject) => {
        const uploadStream =
            cloudinary.uploader.upload_stream(
                {
                    folder: "user_images",
                    resource_type: "image",
                },
                (error, uploadedResult) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(uploadedResult);
                    }
                }
            );

        Readable.from(file.buffer).pipe(uploadStream);
    });

    return result.secure_url;
};

// ==========================================
// ADD USER + CLOUDINARY + BREVO
// ==========================================

export const addUser = async (req, res) => {
    try {
        const name =
            req.body.name || req.body.fullName;

        const email = normalizeEmail(
            req.body.email || ""
        );

        const phone =
            req.body.phone || "Not provided";

        const address =
            req.body.address || "Not provided";

        const { password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: 0,
                message:
                    "Name, email and password are required",
            });
        }

        const existingUser =
            await userData.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                status: 0,
                message:
                    "Email already registered. Please login.",
            });
        }

        let imageUrl = "";

        if (req.file) {
            imageUrl =
                await uploadToCloudinary(req.file);
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const saveUserData =
            await userData.create({
                name,
                email,
                phone,
                address,
                password: hashedPassword,
                image: imageUrl,
                otp: null,
                otpExpires: null,
                isVerified: true,
            });

        // Send welcome email through Brevo.
        // Registration remains successful if email delivery fails.
        try {
            await sendWelcomeEmail(
                saveUserData.email,
                saveUserData.name
            );
        } catch (emailError) {
            console.error(
                "Brevo Welcome Email Error:",
                emailError.message
            );
        }

        return res.status(201).json({
            status: 1,
            message: "User registered successfully",
            data: publicUser(saveUserData),
        });

    } catch (error) {
        console.error("Add User Error:", error);

        return res.status(500).json({
            status: 0,
            message:
                error.message ||
                "Unable to register user",
        });
    }
};

// ==========================================
// VERIFY OTP
// ==========================================

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                status: 0,
                message:
                    "Email and OTP are required",
            });
        }

        const user = await userData.findOne({
            email: normalizeEmail(email),
        });

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        if (user.isVerified) {
            return res.status(200).json({
                status: 1,
                message: "Email is already verified",
            });
        }

        if (
            !user.otp ||
            user.otp !== otp.toString().trim()
        ) {
            return res.status(400).json({
                status: 0,
                message: "Invalid OTP",
            });
        }

        if (
            !user.otpExpires ||
            new Date() > new Date(user.otpExpires)
        ) {
            return res.status(400).json({
                status: 0,
                message:
                    "OTP has expired. Please request a new one.",
            });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;

        await user.save();

        return res.status(200).json({
            status: 1,
            message: "Email verified successfully",
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// RESEND OTP
// ==========================================

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 0,
                message: "Email is required",
            });
        }

        const user = await userData.findOne({
            email: normalizeEmail(email),
        });

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        if (user.isVerified) {
            return res.status(200).json({
                status: 1,
                message: "Email is already verified",
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        user.otp = otp;
        user.otpExpires =
            new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        await sendOtpEmail(user.email, otp);

        return res.status(200).json({
            status: 1,
            message:
                "Verification OTP sent to your email",
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);

        return res.status(500).json({
            status: 0,
            message: "Unable to send OTP",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// GET ALL USERS
// ==========================================

export const getUser = async (req, res) => {
    try {
        const allUsers = await userData
            .find()
            .select("-password -otp -otpExpires");

        return res.status(200).json({
            status: 1,
            message: "Users fetched successfully",
            data: allUsers,
        });

    } catch (error) {
        console.error("Get Users Error:", error);

        return res.status(500).json({
            status: 0,
            errorMessage: error.message,
        });
    }
};

// ==========================================
// GET SINGLE USER
// ==========================================

export const getSingleUser = async (req, res) => {
    try {
        const singleUser = await userData
            .findById(req.params.uid)
            .select("-password -otp -otpExpires");

        if (!singleUser) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        return res.status(200).json({
            status: 1,
            message: "User fetched successfully",
            data: singleUser,
        });

    } catch (error) {
        return res.status(500).json({
            status: 0,
            errorMessage: error.message,
        });
    }
};

// ==========================================
// DELETE USER
// ==========================================

export const deleteUser = async (req, res) => {
    try {
        const deletedUser =
            await userData.findByIdAndDelete(
                req.params.uid
            );

        if (!deletedUser) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        return res.status(200).json({
            status: 1,
            message: "User deleted successfully",
            data: publicUser(deletedUser),
        });

    } catch (error) {
        return res.status(500).json({
            status: 0,
            errorMessage: error.message,
        });
    }
};

// ==========================================
// UPDATE USER + CLOUDINARY IMAGE
// ==========================================

export const updateUser = async (req, res) => {
    try {
        const { uid } = req.params;

        const {
            name,
            email,
            phone,
            address,
            password,
        } = req.body;

        const user =
            await userData.findById(uid);

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (email !== undefined) {
            const normalizedEmail =
                normalizeEmail(email);

            const duplicate =
                await userData.findOne({
                    email: normalizedEmail,
                    _id: { $ne: user._id },
                });

            if (duplicate) {
                return res.status(409).json({
                    status: 0,
                    message: "Email already registered",
                });
            }

            user.email = normalizedEmail;
        }

        if (phone !== undefined) {
            user.phone = phone;
        }

        if (address !== undefined) {
            user.address = address;
        }

        if (password && password.trim()) {
            user.password =
                await bcrypt.hash(password, 10);
        }

        // Replace image only when a new file is selected.
        if (req.file) {
            user.image =
                await uploadToCloudinary(req.file);
        }

        await user.save();

        return res.status(200).json({
            status: 1,
            message: "User updated successfully",
            data: publicUser(user),
        });

    } catch (error) {
        console.error("Update User Error:", error);

        return res.status(500).json({
            status: 0,
            message:
                error.message ||
                "Unable to update user",
        });
    }
};

// ==========================================
// LOGIN USER + SUPER ADMIN + JWT
// ==========================================

export const loginuser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 0,
                message:
                    "Email and password are required",
            });
        }

        const normalizedEmail =
            normalizeEmail(email);

        // SUPER ADMIN
        if (
            normalizedEmail === "admin@system.com" &&
            password === "adminpassword123"
        ) {
            const superAdmin = {
                id: "superadmin",
                email: "admin@system.com",
                role: "superadmin",
            };

            const token =
                generateToken(superAdmin);

            return res.status(200).json({
                status: 1,
                message:
                    "Super Admin login successful",
                token,
                data: {
                    id: "superadmin",
                    email: "admin@system.com",
                    role: "superadmin",
                    name: "Super Admin",
                },
            });
        }

        // NORMAL USER
        const user = await userData.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User Not Found",
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                status: 0,
                message: "Invalid Password",
            });
        }

        const token = generateToken({
            id: user._id.toString(),
            _id: user._id.toString(),
            email: user.email,
            role: user.role || "user",
        });

        return res.status(200).json({
            status: 1,
            message: "Login successful",
            token,
            data: {
                ...publicUser(user),
                role: user.role || "user",
            },
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// GET MY PROFILE
// ==========================================

export const getMyProfile = async (req, res) => {
    try {
        const userId =
            req.user?.id || req.user?._id;

        if (!req.user || !userId) {
            return res.status(401).json({
                status: 0,
                message:
                    "Invalid authentication token",
            });
        }

        // SUPER ADMIN PROFILE
        if (
            req.user.role === "superadmin" ||
            userId === "superadmin"
        ) {
            return res.status(200).json({
                status: 1,
                message:
                    "Super Admin profile fetched successfully",
                data: {
                    id: "superadmin",
                    email: "admin@system.com",
                    role: "superadmin",
                    name: "Super Admin",
                },
            });
        }

        const user = await userData
            .findById(userId)
            .select("-password -otp -otpExpires");

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Profile fetched successfully",
            data: {
                ...user.toObject(),
                role: user.role || "user",
            },
        });

    } catch (error) {
        console.error("GET PROFILE ERROR:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// FORGOT PASSWORD - SEND OTP THROUGH BREVO
// ==========================================

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 0,
                message: "Email is required",
            });
        }

        const user = await userData.findOne({
            email: normalizeEmail(email),
        });

        if (!user) {
            return res.status(404).json({
                status: 0,
                message:
                    "User not found with this email",
            });
        }

        const resetOtp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        user.otp = resetOtp;
        user.otpExpires =
            new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        try {
            await sendForgotPasswordEmail(
                user.email,
                resetOtp
            );
        } catch (emailError) {
            // Clear the OTP if sending the email fails.
            user.otp = null;
            user.otpExpires = null;

            await user.save();

            console.error(
                "Brevo Reset OTP Error:",
                emailError.message
            );

            return res.status(502).json({
                status: 0,
                message:
                    "Could not send reset email. Please try again.",
            });
        }

        return res.status(200).json({
            status: 1,
            message:
                "Password reset OTP sent to your registered email",
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// RESET PASSWORD - VERIFY OTP + UPDATE
// ==========================================

export const resetPassword = async (req, res) => {
    try {
        const {
            email,
            otp,
            newPassword,
            confirmPassword,
        } = req.body;

        if (
            !email ||
            !otp ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                status: 0,
                message:
                    "Email, OTP, new password and confirm password are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                status: 400,
                message: "Passwords do not match",
            });
        }

        const user = await userData.findOne({
            email: normalizeEmail(email),
        });

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        if (
            !user.otp ||
            user.otp !== otp.toString().trim()
        ) {
            return res.status(400).json({
                status: 0,
                message: "Invalid OTP",
            });
        }

        if (
            !user.otpExpires ||
            new Date() > new Date(user.otpExpires)
        ) {
            return res.status(400).json({
                status: 400,
                message:
                    "OTP has expired. Please request a new one.",
            });
        }

        user.password =
            await bcrypt.hash(newPassword, 10);

        user.otp = null;
        user.otpExpires = null;

        await user.save();

        return res.status(200).json({
            status: 1,
            message:
                "Password has been reset successfully. You can now log in.",
        });

    } catch (error) {
        console.error("Reset Password Error:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error",
            errorMessage: error.message,
        });
    }
};

// ==========================================
// STANDALONE CLOUDINARY IMAGE UPLOAD
// ==========================================

export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 0,
                message:
                    "Please select an image file",
            });
        }

        const result = await new Promise(
            (resolve, reject) => {
                const uploadStream =
                    cloudinary.uploader.upload_stream(
                        {
                            folder: "user_images",
                            resource_type: "image",
                        },
                        (error, uploadedResult) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(uploadedResult);
                            }
                        }
                    );

                Readable.from(req.file.buffer)
                    .pipe(uploadStream);
            }
        );

        return res.status(200).json({
            status: 1,
            message: "Image uploaded successfully",
            imageUrl: result.secure_url,
            publicId: result.public_id,
        });

    } catch (error) {
        console.error(
            "Cloudinary Upload Error:",
            error.message
        );

        return res.status(500).json({
            status: 0,
            message: "Image upload failed",
            errorMessage: error.message,
        });
    }
};