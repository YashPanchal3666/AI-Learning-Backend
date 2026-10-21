import userData from "../model/user.js";
import bcrypt from 'bcrypt';
import { generateToken } from "../utils/jwtUtils.js";
import cloudinary from "../Config/cloudinary.js";
import { Readable } from "stream";

export const addUser = async (req, res) => {
    try {
        const { name, email, phone, address, password } = req.body;

        // Check required fields
        if (!name || !email || !phone || !address || !password) {
            return res.status(400).json({
                status: 0,
                message: "Please fill all required fields",
            });
        }

        // Upload image to Cloudinary if selected
        let imageUrl = "";

        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user and Cloudinary image URL in MongoDB
        const saveUserData = await userData.create({
            name,
            email: email.trim().toLowerCase(),
            phone,
            address,
            password: hashedPassword,
            image: imageUrl,
        });

        // Do not send password to frontend
        const userResponse = saveUserData.toObject();
        delete userResponse.password;

        return res.status(201).json({
            status: 1,
            message: "User added successfully",
            data: userResponse,
        });
    } catch (error) {
        console.error("Add User Error:", error);

        return res.status(500).json({
            status: 0,
            message: error.message || "Unable to add user",
        });
    }
};


export const getUser = async (req, res) => {
  try {
    const allUsers = await userData.find();

    res.status(200).json({
      message: "users fetched successfully",
      data: allUsers,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      errorMessage: error.message,
    });
  }
};

export const getSingleUser = async (req,res) => {
    try {
        const userId = req.params.uid
        const singleUser = await userData.findById(userId)
        if(!singleUser) {
            return res.status(404).json({errorMessage:"User not found"})
        }
        res.status(200).json({message:"user fetched successfully",data:singleUser})
    }catch(error) {
        res.status(500).json({errorMessage:error.message})
    }
}

export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.uid
        const deletedUser = await userData.findByIdAndDelete(userId)
        if (!deletedUser) {
            return res.status(404).json({ errorMessage: "User not found" })
        }
        res.status(200).json({ message: "user deleted successfully", data: deletedUser })
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const { name, email, phone, address, password } = req.body;

        const user = await userData.findById(uid);

        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "User not found",
            });
        }

        // Update normal fields only when provided
        if (name !== undefined) user.name = name;
        if (email !== undefined) {
            user.email = email.trim().toLowerCase();
        }
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        // Update password only when a new password is entered
        if (password && password.trim()) {
            user.password = await bcrypt.hash(password, 10);
        }

        // Replace image only when a new image is selected
        if (req.file) {
            user.image = await uploadToCloudinary(req.file);
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json({
            status: 1,
            message: "User updated successfully",
            data: userResponse,
        });
    } catch (error) {
        console.error("Update User Error:", error);

        return res.status(500).json({
            status: 0,
            message: error.message || "Unable to update user",
        });
    }
};

export const loginuser = async (req, res) => {

    try {

        const { email, password } = req.body;

        // =====================================
        // CHECK INPUT
        // =====================================

        if (!email || !password) {

            return res.status(400).json({

                status: 0,

                message: "Email and password are required"

            });

        }


        // =====================================
        // SUPER ADMIN
        // =====================================

        if (
            email.toLowerCase() === "admin@system.com" &&
            password === "adminpassword123"
        ) {

            const superAdmin = {

                id: "superadmin",

                email: "admin@system.com",

                role: "superadmin"

            };

            const token = generateToken(superAdmin);

            return res.status(200).json({

                status: 1,

                message: "Super Admin login successful",

                token: token,

                data: {

                    id: "superadmin",

                    email: "admin@system.com",

                    role: "superadmin",

                    name: "Super Admin"

                }

            });

        }


        // =====================================
        // NORMAL USER
        // =====================================

        const user = await userData.findOne({

            email: email.toLowerCase()

        });


        if (!user) {

            return res.status(404).json({

                status: 0,

                message: "User Not Found"

            });

        }


        // =====================================
        // PASSWORD CHECK
        // =====================================

        const passwordMatch = await bcrypt.compare(

            password,

            user.password

        );


        if (!passwordMatch) {

            return res.status(401).json({

                status: 0,

                message: "Invalid Password"

            });

        }


        // =====================================
        // JWT
        // =====================================

        const token = generateToken({

            _id: user._id,

            email: user.email,

            role: user.role || "user"

        });


        // =====================================
        // USER RESPONSE
        // =====================================

        const userResponse = user.toObject();

        delete userResponse.password;


        return res.status(200).json({

            status: 1,

            message: "Login successful",

            token: token,

            data: {

                ...userResponse,

                role: user.role || "user"

            }

        });


    } catch (error) {

        console.error("Login Error:", error);

        return res.status(500).json({

            status: 0,

            message: "Server error",

            errorMessage: error.message

        });

    }

};
export const getMyProfile = async (req, res) => {

    try {

        console.log("JWT USER:", req.user);

        // =====================================
        // CHECK JWT
        // =====================================

        if (!req.user || !req.user.id) {

            return res.status(401).json({
                status: 0,
                message: "Invalid authentication token"
            });

        }

        // =====================================
        // SUPER ADMIN
        // =====================================

        if (req.user.role === "superadmin") {

            return res.status(200).json({

                status: 1,

                message: "Super Admin profile fetched successfully",

                data: {

                    id: "superadmin",

                    email: "admin@system.com",

                    role: "superadmin",

                    name: "Super Admin"

                }

            });

        }

        // =====================================
        // NORMAL USER
        // =====================================

        const user = await userData
            .findById(req.user.id)
            .select("-password");

        if (!user) {

            return res.status(404).json({

                status: 0,

                message: "User not found"

            });

        }

        return res.status(200).json({

            status: 1,

            message: "Profile fetched successfully",

            data: {

                ...user.toObject(),

                role: user.role || "user"

            }

        });

    } catch (error) {

        console.error("GET PROFILE ERROR:", error);

        return res.status(500).json({

            status: 0,

            message: "Server error",

            errorMessage: error.message

        });

    }

};
// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (req, res) => {

    try {

        const {
            email,
            newPassword,
            confirmPassword
        } = req.body;


        // Check email
        if (!email) {

            return res.json({
                message: "Email is required",
                status: 0
            });

        }


        // Check new password
        if (!newPassword) {

            return res.json({
                message: "New password is required",
                status: 0
            });

        }


        // Check confirm password
        if (!confirmPassword) {

            return res.json({
                message: "Confirm password is required",
                status: 0
            });

        }


        // Check password match
        if (newPassword !== confirmPassword) {

            return res.json({
                message: "Passwords do not match",
                status: 0
            });

        }


        // Find user in MongoDB
        const user = await userData.findOne({
            email: email.trim().toLowerCase()
        });


        // User not found
        if (!user) {

            return res.json({
                message: "User Not Found",
                status: 0
            });

        }


        // Hash new password
        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );


        // Update password
        user.password = hashedPassword;

        await user.save();


        // Success
        return res.json({

            message: "Password reset successfully",
            status: 1

        });


    } catch (error) {

        console.error(
            "Forgot Password Error:",
            error
        );


        return res.status(500).json({

            message: "Server error",
            status: 0,

            errorMessage:
                error.message

        });

    }

};


// Upload image to Cloudinary
export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 0,
                message: "Please select an image file"
            });
        }

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "user_images",
                    resource_type: "image"
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            Readable.from(req.file.buffer).pipe(uploadStream);
        });

        return res.status(200).json({
            status: 1,
            message: "Image uploaded successfully",
            imageUrl: result.secure_url,
            publicId: result.public_id
        });

    } catch (error) {
        console.error("Cloudinary Upload Error:", error.message);

        return res.status(500).json({
            status: 0,
            message: "Image upload failed"
        });
    }
};


const uploadToCloudinary = async (file) => {
  if (!file) return "";

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "user_images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });

  return result.secure_url;
};
