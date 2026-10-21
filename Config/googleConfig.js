import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwtUtils.js";
import userData from "../model/user.js";

console.log("GOOGLE CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE CALLBACK:", process.env.GOOGLE_CALLBACK_URL);

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                const email =
                    profile.emails &&
                    profile.emails[0]
                        ? profile.emails[0].value
                        : null;

                const name =
                    profile.displayName ||
                    "Google User";

                if (!email) {
                    return done(
                        new Error("Google email not found"),
                        null
                    );
                }

                // Find existing user
                let user = await userData.findOne({
                    email: email
                });

                // ==========================================
                // CREATE NEW USER
                // ==========================================

                if (!user) {

                    const randomPassword =
                        await bcrypt.hash(
                        Math.random()
                        .toString(36)
                        .slice(-12),
                        10
                     );

                    user = await userData.create({
    name: name,
    email: email,
    phone: "Not Provided",
    address: "Not Provided",
    password: randomPassword,
    role: "user"
});
                }

                // ==========================================
                // GENERATE JWT
                // ==========================================

                const token = generateToken(user);

                return done(
                    null,
                    {
                        user,
                        token
                    }
                );

            } catch (error) {

                console.error(
                    "Google Authentication Error:",
                    error
                );

                return done(error, null);
            }
        }
    )
);

export default passport;