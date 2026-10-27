import express from "express";
import {
    addUser,
    getUser,
    getSingleUser,
    deleteUser,
    updateUser,
    loginuser,
    getMyProfile,
    forgotPassword,
    verifyOtp,
    resendOtp,
    resetPassword
} from "../controller/userDataController.js";

import authMiddleware from "../utils/authMiddleware.js";

const router = express.Router();

// ==========================================
// PUBLIC AUTH & USER ROUTES
// ==========================================
router.post("/login", loginuser);
router.post("/adduser", addUser);

// ==========================================
// EMAIL & OTP VERIFICATION ROUTES (BREVO)
// ==========================================
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ==========================================
// CRUD USER ROUTES
// ==========================================
router.get("/users", getUser);
router.get("/users/:uid", getSingleUser);
router.put("/users/:uid", updateUser);
router.delete("/users/:uid", deleteUser);

// ==========================================
// PROTECTED PROFILE
// ==========================================
router.get("/me", authMiddleware, getMyProfile);

export default router;