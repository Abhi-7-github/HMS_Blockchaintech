# AmedicK (HMS BlockchainTech) - Hospital Management System

A modern, full-stack Hospital Management System built with a Node.js/Express backend and React + Tailwind CSS frontend architecture.

---

## 🛠️ Implemented Progress & Setup Till Now

### 🗂️ 1. Project Architecture & Setup
- **Dual-Directory Structure**: Clean separation between `client/` (Frontend) and `server/` (Backend).
- **Version Control**: Git repository initialized on the `main` branch.

---

### 🖥️ 2. Backend Implementation (`server/`)
- **Express Server Baseline**: Server entry point (`server.js`) configured with HTTP listener.
- **Environment Management**: Integrated `dotenv` configured to load server environment variables (`.env`).
- **Installed Stack & Dependencies**:
  - **`express`**: Web framework for building REST APIs.
  - **`mongoose` & `mongodb`**: Object Data Modeling (ODM) and driver for MongoDB database integration.
  - **`jsonwebtoken` (JWT)**: Security library for user authentication and authorization.
  - **`nodemon`**: Development tool for automatic server restarts upon file edits.

---

### 💻 3. Frontend Implementation (`client/`)
- **Build Engine & Framework**:
  - React 19 bootstrapped using Vite.
  - Configured `@vitejs/plugin-react` plugin in `vite.config.js`.
- **Styling Architecture**:
  - **Tailwind CSS v4** configured with `@tailwindcss/vite` plugin.
  - Direct CSS import setup in `src/index.css` via `@import "tailwindcss";`.
- **Routing Infrastructure**:
  - **`react-router-dom`**: Client-side routing library installed for single-page app navigation.
- **Starter Components**:
  - React starter application configured in `src/App.jsx` with asset loading and state management demo.

---

## 📁 Directory Structure

```
HMS_Blockchaintech/
├── README.md               # Project documentation & implementation log
├── server/                 # Express.js Backend Application
│   ├── .env                # Server Environment Variables (PORT, etc.)
│   ├── package.json        # Backend dependencies & scripts
│   └── server.js           # Server application entry point
└── client/                 # React + Vite Frontend Application
    ├── vite.config.js      # Vite configuration (React + Tailwind plugins)
    ├── package.json        # Frontend dependencies & scripts
    └── src/
        ├── main.jsx        # React application entry point
        ├── App.jsx         # Main application component
        └── index.css       # Global styles importing Tailwind CSS
```

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd server
npm start
```

### 2. Frontend Setup
```bash
cd client
npm run dev
```
