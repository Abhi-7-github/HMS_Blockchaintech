require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Enable CORS for cross-origin requests from React frontend
app.use(cors());

app.use(express.json());

// Auth routes
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT;

// Connect to MongoDB before starting the HTTP server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
};

startServer();