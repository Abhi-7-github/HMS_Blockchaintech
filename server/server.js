require("dotenv").config();
const express = require("express");
const cors = require("cors");
const envConfig = require("./config/env");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Enable CORS for cross-origin requests from React frontend
app.use(cors());

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/admin", adminRoutes);

const PORT = envConfig.PORT;

// Connect to MongoDB before starting the HTTP server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
};

startServer();