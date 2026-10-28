
import express from "express";
import passport from "../Config/googleConfig.js";

const router = express.Router();

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${FRONTEND_URL}/login`
    }),
    (req, res) => {
        try {
            const token = req.user.token;
            const user = req.user.user;

            const userData = encodeURIComponent(
                JSON.stringify({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    role: user.role
                })
            );

            res.redirect(
                `${FRONTEND_URL}/google-success?token=${encodeURIComponent(token)}&user=${userData}`
            );

        } catch (error) {
            console.error(
                "Google Callback Error:",
                error
            );

            res.redirect(`${FRONTEND_URL}/login`);
        }
    }
);

export default router;
