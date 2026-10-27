import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        default: "user"
    },

    otp: {
        type: String,
        default: null
    },

    otpExpires: {
        type: Date,
        default: null
    },

    isVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const userData = mongoose.model("User", userSchema);

export default userData;