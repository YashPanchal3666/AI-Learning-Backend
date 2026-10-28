import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDb from "./Config/db.js";
import userRoute from "./route/userRoute.js";
import googleRoute from "./route/googleRoute.js";
import uploadRoute from "./route/uploadRoute.js";
import "./Config/googleConfig.js";

const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    "https://ai-learning-frontend-delta.vercel.app",
    "https://ai-learning-frontend-mf9mxk5ai-yash-panchal.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests without an Origin header, such as server-to-server requests.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error("Not allowed by CORS: " + origin)
        );
    },
    credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// Google authentication routes
app.use("/api/auth", googleRoute);

// Test route
app.get("/", (req, res) => {
    res.json({
        status: 1,
        message: "Backend run successfully"
    });
});

// Existing API routes
app.use("/api", userRoute);
app.use("/api", uploadRoute);

// Database + Server
const PORT = process.env.PORT || 5000;

connectDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `App is running on port ${PORT}`
            );
        });
    })
    .catch((error) => {
        console.log(
            "Server not started:",
            error.message
        );
    });