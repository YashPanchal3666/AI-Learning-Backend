import express from "express";
import passport from "../Config/googleConfig.js";

const router = express.Router();

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
        failureRedirect: "http://localhost:3000/login"
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
                `http://localhost:3000/google-success?token=${token}&user=${userData}`
            );

        } catch (error) {

            console.error(
                "Google Callback Error:",
                error
            );

            res.redirect(
                "http://localhost:3000/login"
            );
        }
    }
);

export default router;