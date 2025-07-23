// js/main.js
import { onAuthStateChanged, signOut, currentUser } from "./auth.js";
import {
  listenForTasks,
  updateTaskInFirestore,
  deleteTaskFromFirestore,
  addTaskToFirestore,
  getAppVersion,
  getTaskById,
  countUserActiveTasks, // <--- ADD THIS IMPORT
} from "./firestoreOperations.js";
import { renderTasksAndLogs } from "./uiRender.js";
import {
  convertHmToMinutes,
  formatTime,
  calculateDurationInHours,
} from "./utils.js";
import { setupCsvExport } from "./csvExport.js";
import {
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

// DOM Elements
const addTaskBtn = document.getElementById("addTaskBtn");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeMessage = document.getElementById("welcomeMessage");
const taskTableBody = document.getElementById("taskTableBody");
const darkModeToggle = document.getElementById("darkModeToggle");
const appSection = document.getElementById("appSection");

// ========== AUTH STATE ==========
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged((user) => {
    if (user) {
      if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${user.name}`;
      listenForTasks(renderTasksAndLogs);
      checkForUpdate();
      // Show app section after successful login
      if (appSection) appSection.classList.remove("hidden");
    } else {
      // Redirect to login if not authenticated
      window.location.href = "log-in.html";
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut();
    });
  }

  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", async () => {
      const resourceName = currentUser?.name || "Unknown";
      if (!resourceName || resourceName === "Unknown") {
        alert("Could not determine user to add task.");
        return;
      }

      // Check existing active tasks for the current user
      const activeTasksCount = await countUserActiveTasks(resourceName);
      if (activeTasksCount >= 2) {
        alert(
          "You can only have a maximum of 2 active tasks at a time. Please complete existing tasks before adding new ones."
        );
        return;
      }

      await addTaskToFirestore({
        resource: resourceName,
        status: "available",
        project: "",
        date: new Date().toISOString().split("T")[0],
        isActive: false,
        cumulativeTime: [],
      });
    });
  }

  if (taskTableBody) {
    // Update Fields
    taskTableBody.addEventListener("change", async (event) => {
      const target = event.target;
      const taskId = target.dataset.id;
      const field = target.dataset.field;
      if (!taskId || !field) return;

      let updateData = {};
      if (field === "status") updateData.status = target.value;
      if (field === "project") updateData.project = target.value;
      if (field === "expectedTime")
        updateData.expectedTime = convertHmToMinutes(target.value);
      if (field === "priority") updateData.priority = target.value;

      await updateTaskInFirestore(taskId, updateData);
    });

    // Handle Delete / Toggle
    taskTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      const taskId =
        target.dataset.id ||
        target.closest("button")?.dataset.id ||
        target.closest("label")?.querySelector("input")?.dataset.id;
      if (!taskId) return;

      // Delete
      if (
        target.classList.contains("delete-task-btn") ||
        target.closest(".delete-task-btn")
      ) {
        if (confirm("Delete this task?")) {
          await deleteTaskFromFirestore(taskId);
        }
      }

      // Toggle Activity
      if (target.dataset.action === "toggleActivity") {
        const isActive = target.checked;
        if (isActive) {
          await updateTaskInFirestore(taskId, {
            isActive: true,
            lastActiveChange: new Date(),
          });
        } else {
          const taskData = await getTaskById(taskId); // Fetch latest task data
          if (!taskData) return;

          const startDate = taskData.lastActiveChange?.toDate(); // Firestore Timestamp to Date object
          const endDate = new Date();

          if (!startDate) {
            console.warn("No start time found for inactive task.");
            await updateTaskInFirestore(taskId, {
              isActive: false,
              lastActiveChange: null,
            });
            return;
          }

          // Calculate duration in hours, ensure it's a number
          const duration = calculateDurationInHours(startDate, endDate);

          const updatedCumulativeTime = taskData.cumulativeTime || [];
          updatedCumulativeTime.push({
            start: formatTime(startDate),
            end: formatTime(endDate),
            duration: duration, // Store duration for this segment
          });

          await updateTaskInFirestore(taskId, {
            isActive: false,
            cumulativeTime: updatedCumulativeTime,
            lastActiveChange: null,
          });
        }
      }
    });
  }

  // Set up CSV Export
  setupCsvExport();

  // Dark Mode Toggle Logic
  const darkModeToggle = document.getElementById("darkModeToggle"); // Redefine inside DOMContentLoaded if it's not global
  if (darkModeToggle) {
    const isDarkMode = localStorage.getItem("darkMode") === "enabled";
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener("change", () => {
      if (darkModeToggle.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "enabled");
      } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "disabled");
      }
    });
  }
});

// ============================
// Version Check
// ============================
const updateBar = document.getElementById("updateBar");
const reloadBtn = document.getElementById("reloadBtn");

export async function checkForUpdate() {
  try {
    const latestVersion = await getAppVersion();
    if (!latestVersion) return;
    const storedVersion = localStorage.getItem("appVersion");

    if (storedVersion !== latestVersion) {
      updateBar.style.display = "flex";
      reloadBtn.onclick = () => {
        localStorage.setItem("appVersion", latestVersion);
        updateBar.style.display = "none";
        location.reload(true);
      };
    } else {
      updateBar.style.display = "none";
    }

    if (!storedVersion) {
      localStorage.setItem("appVersion", latestVersion);
    }
  } catch (error) {
    console.error("Error checking app updates:", error);
  }
}

setInterval(checkForUpdate, 5 * 60 * 1000); // Check for update every 5 minutes
