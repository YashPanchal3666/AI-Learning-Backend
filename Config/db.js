import mongoose from "mongoose";

const connectDb = async () => {
    try {

        const conn = await mongoose.connect(
            process.env.MONGODB_URI || "mongodb+srv://nightmusichd3_db_user:T90jaubXAxEXPeh5@cluster0.xo0ijyw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        );

        console.log(
            `MongoDB Connected: ${conn.connection.host}`
        );

    } catch (error) {

        console.log(
            "MongoDB Connection Error:",
            error.message
        );

        throw error;
    }
};

export default connectDb;