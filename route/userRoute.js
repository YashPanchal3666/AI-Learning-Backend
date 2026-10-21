import express from "express";

import {
    addUser,
    getUser,
    getSingleUser,
    deleteUser,
    updateUser,
    loginuser,
    getMyProfile,
    forgotPassword
} from "../controller/userDataController.js";

import authMiddleware from "../utils/authMiddleware.js";

import uploadMiddleware from "../utils/uploadMiddleware.js";
import { uploadImage } from "../controller/userDataController.js";

const router = express.Router();


// ==========================================
// PUBLIC ROUTES
// ==========================================

router.post("/login", loginuser);


router.post("/forgot-password", forgotPassword);

router.get("/users", getUser);

router.get("/users/:uid", getSingleUser);


router.delete("/users/:uid", deleteUser);

// Add user with profile image
router.post(
    "/adduser",
    uploadMiddleware.single("image"),
    addUser
);

// Update user with optional profile image
router.put(
    "/users/:uid",
    uploadMiddleware.single("image"),
    updateUser
);  

router.post(
    "/upload-image",
    uploadMiddleware.single("image"),
    uploadImage
);

// ==========================================
// PROTECTED PROFILE
// ==========================================

router.get(
    "/me",
    authMiddleware,
    getMyProfile
);


export default router;