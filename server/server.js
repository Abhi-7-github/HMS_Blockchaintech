require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();

app.use(express.json());

const PORT = process.env.PORT;

// Connect to MongoDB before starting the HTTP server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
};

startServer();