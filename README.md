# 📝 TeamSync | Task Logger

![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow?logo=javascript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green)

A real-time **team task logging and activity tracking system** built with **JavaScript, Firebase, and Firestore**.  
It allows users to log tasks, track working time, export logs, and helps admins monitor active resources.

---

## 🚀 Features

✔ **Real-time Task Management** (Add, Edit, Delete)  
✔ **Automatic Time Logging** with cumulative time tracking  
✔ **Daily Session Reset at 12 AM**  
✔ **Hourly Reminders for Active Tasks**  
✔ **Dark Mode Support**  
✔ **CSV Export for Logs**  
✔ **Admin Panel** to view available resources  
✔ **Auto Version Update Prompt**  
✔ **Responsive & User-Friendly UI**

---

## ⚡ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)  
- **Backend:** Firebase Firestore  
- **Authentication:** Firebase Auth  
- **Export:** CSV Export  
- **Notifications:** Web Notifications API  

---

## 📂 Project Structure
```
├── index.html # Main Dashboard
├── css/
│ └── style.css # Styles (Light/Dark Mode)
├── js/
│ ├── main.js # Core Logic
│ ├── auth.js # Firebase Authentication
│ ├── firestoreOperations.js # Firestore CRUD operations
│ ├── uiRender.js # Render Tasks & Logs
│ ├── utils.js # Helper Functions (time calculations)
│ ├── csvExport.js # CSV Export Logic
│ └── firebaseConfig.js # Firebase Initialization
├── images/
│ └── istockphoto-1667448660-1024x1024.jpg # Background
└── README.md
```

---

## 🛠️ Installation & Setup

### **1. Clone the repository**
```bash
git clone https://github.com/<your-username>/teamsync-task-logger.git
cd teamsync-task-logger
```
--
### 2. Add Firebase Configuration

```bash
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```
--
### 3. Run the Project

✔ **Option 1:** Open ```index.html``` directly in your browser.  
✔ **Option 2:** Run a local server:  
```bash
npx live-server
```
---

## 🔥 Key Functionalities

### ✅ Daily Session Reset

✔ At **12 AM**, all active tasks are stopped.  
✔ **Table clears automatically for the new day.**  
✔ Previous day’s logs move to the **Activity Log & Admin Panel.**  

### ✅ Hourly Reminder
✔ If a user keeps a task active for 1 hour, a desktop notification appears: **"Need more time?"**  
✔ Clicking Yes continues logging for another hour.

### ✅ CSV Export
✔ **Click Export Logs to download all daily logs in .csv format.**

---

## 🧑‍💻 Contribution Guidelines

- Fork the repo  
- Create a new branch  
- Commit changes with proper messages  
- Create a Pull Request  

---

## 🐛 Known Issues / To-Do

- Archive old tasks in a separate Firestore collection (dailyLogs)  
- Better UI for "Need More Time?" (Modal instead of browser notification)  
- Admin dashboard analytics (graphical reports)  

---

## 📜 License

This project is licensed under the MIT License – you’re free to use, modify, and distribute.

## 💬 Contact

- 👤 Your Name  
- 📧 Email: [kaustavsengupta790@gmail.com]  
- 🐙 GitHub: @kaustav991a  
