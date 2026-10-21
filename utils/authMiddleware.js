import jwt from "jsonwebtoken";
import secretKey from "../Config/jwtConfig.js";

const authMiddleware = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        console.log("AUTHORIZATION HEADER:", authHeader);

        // No token
        if (!authHeader) {

            return res.status(401).json({

                status: 0,

                message: "Authorization token required"

            });

        }

        // Wrong format
        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({

                status: 0,

                message: "Invalid authorization format"

            });

        }

        const token = authHeader.split(" ")[1];

        if (!token) {

            return res.status(401).json({

                status: 0,

                message: "Token missing"

            });

        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            secretKey
        );

        console.log("DECODED JWT:", decoded);

        // Save decoded JWT
        req.user = decoded;

        next();

    } catch (error) {

        console.error("JWT ERROR:", error.message);

        return res.status(401).json({

            status: 0,

            message: "Invalid or expired token"

        });

    }

};

export default authMiddleware;