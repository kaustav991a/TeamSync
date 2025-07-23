import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYluAvQ8mmnlJewbTu_cp3-0NYQJJPL04",
  authDomain: "tasklogger-ffea7.firebaseapp.com",
  projectId: "tasklogger-ffea7",
  storageBucket: "tasklogger-ffea7.appspot.com",
  messagingSenderId: "656885036033",
  appId: "1:656885036033:web:441d661ec4cb29aab37c00",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Session validation: Ensures currentUser is always defined
let currentUser = null;
try {
  const storedUser = sessionStorage.getItem("currentUser");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    if (!currentUser?.name || !["admin", "user"].includes(currentUser.role)) {
      currentUser = null;
      throw new Error("Invalid user data in session storage.");
    }
  } else {
    throw new Error("No user data found in session storage.");
  }
} catch (e) {
  console.error("Session initialization error:", e);
  alert("Session expired or unauthorized access. Please log in again.");
  window.location.href = "log-in.html";
  // Crucial: Stop execution if user is not valid to prevent further errors
  throw new Error("User session invalid. Stopping script execution.");
}

// If for some reason currentUser is still null (e.g., above throw was caught elsewhere)
if (!currentUser) {
  console.error(
    "Critical: currentUser is not defined after session check. Script halting."
  );
  throw new Error("User session invalid. Stopping script execution.");
}

const isAdmin = currentUser.role === "admin";
document.getElementById("userName").textContent = currentUser.name;

// Elements for Admin Notifications & Panel
const adminNotificationArea = document.getElementById("adminNotificationArea");
const notificationSound = document.getElementById("notificationSound");
const availableUsersPanel = document.getElementById("availableUsersPanel");

// Add 'admin-mode' class to body if admin
if (isAdmin) {
  document.body.classList.add("admin-mode");
}

// Dark mode toggle
document.getElementById("darkModeToggle").addEventListener("change", (e) => {
  const isDark = e.target.checked;
  document.body.classList.toggle("dark", isDark);
  // Apply dark mode to availableUsersPanel directly here
  availableUsersPanel?.classList.toggle("dark", isDark);
});

// --- Utility Functions ---
const debounce = (fn, delay = 500) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Helper to convert HH:MM string to total minutes
const convertHmToMinutes = (hmString) => {
  if (!hmString) return null;
  const parts = hmString.split(":");
  if (parts.length === 2) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    if (
      !isNaN(hours) &&
      !isNaN(minutes) &&
      hours >= 0 &&
      minutes >= 0 &&
      minutes < 60
    ) {
      return hours * 60 + minutes;
    }
  }
  return NaN; // Invalid format
};

// Helper to convert total minutes back to HH:MM string for display
const convertMinutesToHm = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === undefined) return "";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

const updateFieldDebounced = debounce(async (id, field, value) => {
  try {
    const taskRef = doc(db, "tasks", id);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) {
      console.warn(`Attempted to update non-existent task: ${id}`);
      return;
    }
    const taskData = taskSnap.data();

    // Check for "expectedTime" field specifically for admin-only edit
    if (field === "expectedTime") {
      if (isAdmin) {
        let minutesToStore = null;
        if (value !== "") {
          minutesToStore = convertHmToMinutes(value);
          if (isNaN(minutesToStore) || minutesToStore < 0) {
            alert(
              "Expected Time must be in HH:MM format (e.g., 01:30 for 1 hour 30 minutes) and a positive value."
            );
            // Revert the input field value in the UI
            const inputElement = document.querySelector(
              `input[data-id="${id}"][data-field="expectedTime"]`
            );
            if (inputElement) {
              // Revert to old value, converting from stored minutes to HH:MM for display
              inputElement.value = convertMinutesToHm(taskData.expectedTime);
            }
            return;
          }
        }
        await updateDoc(doc(db, "tasks", id), { [field]: minutesToStore });
      } else {
        console.warn(
          `Unauthorized attempt to update expectedTime for task ${id} by user ${currentUser.name}`
        );
        alert("Only admins can set expected time.");
        // Revert the input field if a non-admin tried to change it
        const inputElement = document.querySelector(
          `input[data-id="${id}"][data-field="expectedTime"]`
        );
        if (inputElement) {
          inputElement.value = convertMinutesToHm(taskData.expectedTime); // Revert to old value
        }
      }
    } else if (isAdmin || taskData.resource === currentUser.name) {
      // Existing logic for other fields
      await updateDoc(doc(db, "tasks", id), { [field]: value });
    } else {
      console.warn(
        `Unauthorized attempt to update task ${id} by user ${currentUser.name}`
      );
      alert("You can only edit your own tasks.");
    }
  } catch (error) {
    console.error(`Error updating field ${field} for task ${id}:`, error);
  }
});

const formatTime = (date) => {
  if (!date) return "--:--";
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
};

const calculateDurationInHours = (startTimeStr, endTimeStr) => {
  if (!startTimeStr || !endTimeStr) return 0;
  const parseTime = (timeStr) => {
    let [time, ampm] = timeStr.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return { h, m };
  };
  const startParsed = parseTime(startTimeStr);
  const endParsed = parseTime(endTimeStr);
  const startDate = new Date(0, 0, 0, startParsed.h, startParsed.m);
  const endDate = new Date(0, 0, 0, endParsed.h, endParsed.m);
  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  const diffMs = endDate - startDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours;
};

// Function to calculate total current hours for a task
const getTotalTaskHours = (taskData, now = new Date()) => {
  let totalHours = 0;
  if (taskData.cumulativeTime && taskData.cumulativeTime.length > 0) {
    taskData.cumulativeTime.forEach((segment) => {
      totalHours += calculateDurationInHours(segment.start, segment.end);
    });
  }
  if (taskData.isActive && taskData.lastActiveChange) {
    const startTime = new Date(taskData.lastActiveChange.toDate());
    totalHours += calculateDurationInHours(
      formatTime(startTime),
      formatTime(now)
    );
  }
  return totalHours;
};

// --- Core Task Management Functions ---
document.addEventListener("input", async (e) => {
  const input = e.target;
  const id = input.dataset.id;
  const field = input.dataset.field;

  if (id && (field === "project" || field === "expectedTime")) {
    const value = input.value;
    updateFieldDebounced(id, field, value);
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  const id = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field) return;

  const row = el.closest("tr");
  const taskResource = row ? row.dataset.resource : null;

  // The 'priority' field is only editable by admin, other fields by user or admin
  if (field === "priority" && !isAdmin) {
    alert("Only admins can set priority.");
    // The onSnapshot listener will re-render and correct the dropdown
    return;
  }

  // General check for status updates
  if (field === "status" && !(isAdmin || taskResource === currentUser.name)) {
    alert("You can only edit your own task status.");
    // The onSnapshot listener will re-render and correct the dropdown
    return;
  }

  const value = el.value;

  if (field === "status") {
    try {
      await updateDoc(doc(db, "tasks", id), { status: value });
      if (value === "completed") {
        const taskRef = doc(db, "tasks", id);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists() && taskSnap.data().isActive) {
          await toggleActivity(id, true);
        }

        // --- NEW LOGIC FOR AVAILABILITY AFTER COMPLETION ---
        // Fetch all tasks for the current user (or the task's resource)
        const userTasksQuery = query(
          collection(db, "tasks"),
          where("resource", "==", taskResource || currentUser.name), // Use taskResource if available, else currentUser
          where("date", "==", new Date().toISOString().split("T")[0]), // Only today's tasks
          where("status", "in", [
            "available",
            "practicing",
            "working",
            "testing",
            "reviewing",
          ]) // All non-completed statuses
        );
        const userActiveTasksSnapshot = await getDocs(userTasksQuery);

        // If there are no other non-completed tasks for this user, mark them as "available"
        if (userActiveTasksSnapshot.empty) {
          // Find an 'available' task for this user OR add a new one if none exists
          // This ensures they appear in the availableUsersPanel
          const existingAvailableTaskQuery = query(
            collection(db, "tasks"),
            where("resource", "==", taskResource || currentUser.name),
            where("date", "==", new Date().toISOString().split("T")[0]),
            where("status", "==", "available")
          );
          const existingAvailableTaskSnap = await getDocs(
            existingAvailableTaskQuery
          );

          if (existingAvailableTaskSnap.empty) {
            // If no 'available' task exists, create one for the user
            await addDoc(collection(db, "tasks"), {
              resource: taskResource || currentUser.name,
              status: "available",
              project: "", // Can be empty as it's just an availability marker
              priority: "",
              isActive: false,
              cumulativeTime: [],
              lastActiveChange: null,
              date: new Date().toISOString().split("T")[0],
              createdBy: currentUser.name,
              expectedTime: null,
            });
          } else {
            // If an 'available' task already exists, ensure its status is correct (redundant but safe)
            const availableDoc = existingAvailableTaskSnap.docs[0];
            await updateDoc(doc(db, "tasks", availableDoc.id), {
              status: "available",
            });
          }
        }
        // --- END NEW LOGIC ---
      }
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status. Please try again.");
    }
  } else if (field === "priority" && isAdmin) {
    try {
      await updateDoc(doc(db, "tasks", id), { priority: value });
    } catch (error) {
      console.error("Error updating priority: ", error);
      alert("Failed to update priority. Please try again.");
    }
  }
});

const addTaskBtn = document.getElementById("addTaskBtn");
addTaskBtn.addEventListener("click", async () => {
  const currentUserTasksForToday = Array.from(
    document.getElementById("taskTableBody").querySelectorAll(`tr`)
  ).filter(
    (row) =>
      row.dataset.resource === currentUser.name &&
      row.dataset.status !== "completed"
  );

  if (!isAdmin && currentUserTasksForToday.length >= 2) {
    alert("You can only have a maximum of 2 active tasks at a time.");
    return;
  }

  const task = {
    resource: currentUser.name,
    status: "available",
    project: "",
    priority: "",
    isActive: false,
    cumulativeTime: [],
    lastActiveChange: null,
    date: new Date().toISOString().split("T")[0],
    createdBy: currentUser.name,
    expectedTime: null, // New field initialized to null
  };
  try {
    await addDoc(collection(db, "tasks"), task);
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Failed to add task. Please try again.");
  }
});

window.deleteTask = async (id) => {
  try {
    const taskRef = doc(db, "tasks", id);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) {
      alert("Task not found.");
      return;
    }
    const taskData = taskSnap.data();

    if (isAdmin || taskData.resource === currentUser.name) {
      await deleteDoc(taskRef);
    } else {
      alert("You can only delete your own tasks.");
    }
  } catch (error) {
    console.error("Error deleting document: ", error);
    alert("Failed to delete task. Please try again.");
  }
};

window.undoComplete = async (id) => {
  try {
    const taskRef = doc(db, "tasks", id);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) {
      alert("Task not found.");
      return;
    }
    const taskData = taskSnap.data();

    if (isAdmin || taskData.resource === currentUser.name) {
      await updateDoc(taskRef, {
        status: "working",
        isActive: false,
        lastActiveChange: null,
      });
    } else {
      alert("You can only undo completion for your own tasks.");
    }
  } catch (error) {
    console.error("Error updating document: ", error);
    alert("Failed to undo completion. Please try again.");
  }
};

window.toggleActivity = async (id, currentIsActive) => {
  const taskRef = doc(db, "tasks", id);
  const now = new Date();
  const currentTime = formatTime(now);

  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    console.warn(
      `Task document ${id} not found when trying to toggle activity.`
    );
    return;
  }
  const taskData = taskSnap.data();

  if (!(isAdmin || taskData.resource === currentUser.name)) {
    alert("You can only toggle activity for your own tasks.");
    const targetSwitch = document.querySelector(
      `input[data-id="${id}"][data-field="isActive"]`
    );
    if (targetSwitch) {
      targetSwitch.checked = !currentIsActive;
    }
    return;
  }

  try {
    if (!currentIsActive) {
      const tasksQuery = query(
        collection(db, "tasks"),
        where("resource", "==", currentUser.name),
        where("date", "==", new Date().toISOString().split("T")[0]),
        where("isActive", "==", true)
      );
      const activeTasksSnapshot = await getDocs(tasksQuery);

      if (activeTasksSnapshot.size > 0) {
        alert(
          "Please deactivate your currently active task before starting another."
        );
        const targetSwitch = document.querySelector(
          `input[data-id="${id}"][data-field="isActive"]`
        );
        if (targetSwitch) {
          targetSwitch.checked = false;
        }
        return;
      }

      await updateDoc(taskRef, {
        isActive: true,
        lastActiveChange: serverTimestamp(),
        status: "working",
      });
    } else {
      let updatedCumulativeTime = taskData.cumulativeTime || [];
      if (taskData.isActive && taskData.lastActiveChange) {
        const startTime = new Date(taskData.lastActiveChange.toDate());
        updatedCumulativeTime.push({
          start: formatTime(startTime),
          end: currentTime,
        });
      }

      await updateDoc(taskRef, {
        isActive: false,
        lastActiveChange: null,
        cumulativeTime: updatedCumulativeTime,
      });
    }
  } catch (error) {
    console.error("Error in toggleActivity: ", error);
    alert("Failed to update activity. Please try again.");
  }
};

window.addManualTimeSegment = async (id, currentSegments) => {
  const taskRef = doc(db, "tasks", id);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    alert("Task not found.");
    return;
  }
  const taskData = taskSnap.data();

  if (!(isAdmin || taskData.resource === currentUser.name)) {
    alert("You can only add time to your own tasks.");
    return;
  }

  const startTimeStr = prompt(
    "Enter START time (HH:MM AM/PM), e.g., 09:00 AM or 02:30 PM:"
  );
  if (!startTimeStr) return;

  const endTimeStr = prompt(
    "Enter END time (HH:MM AM/PM), e.g., 10:30 AM or 04:00 PM:"
  );
  if (!endTimeStr) return;

  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s(AM|PM)$/i;
  if (!timeRegex.test(startTimeStr) || !timeRegex.test(endTimeStr)) {
    alert(
      "Invalid time format. Please use HH:MM AM/PM (e.g., 09:00 AM, 02:30 PM)."
    );
    return;
  }

  const newSegment = { start: startTimeStr, end: endTimeStr };
  const updatedSegments = [...(currentSegments || []), newSegment];

  try {
    await updateDoc(doc(db, "tasks", id), {
      cumulativeTime: updatedSegments,
    });
    alert("Time added successfully!");
  } catch (error) {
    console.error("Error adding manual time segment: ", error);
    alert("Failed to add manual time. Please try again.");
  }
};

document.getElementById("taskTableBody").addEventListener("click", (event) => {
  const target = event.target;
  if (target.matches(".add-time-btn") || target.closest(".add-time-btn")) {
    const button = target.closest(".add-time-btn");
    const id = button.dataset.id;
    const currentSegments = JSON.parse(button.dataset.segments || "[]");
    addManualTimeSegment(id, currentSegments);
  }
});

// Helper function to format decimal hours into "X hours Y min"
const formatHoursToHm = (decimalHours) => {
  if (
    decimalHours === null ||
    decimalHours === undefined ||
    isNaN(decimalHours) ||
    decimalHours < 0
  ) {
    return "-";
  }
  const totalMinutes = Math.round(decimalHours * 60);
  if (totalMinutes === 0) {
    return "0 min";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "";
  if (hours > 0) {
    result += `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    if (result !== "") {
      result += " "; // Add space if hours already present
    }
    result += `${minutes} min`;
  }
  return result;
};

const exportBtn = document.getElementById("exportCSVBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    if (!isAdmin) return alert("Only admins can export logs.");

    const rows = [
      [
        "Date",
        "Resource",
        "Project Name", // This column will now include status for certain types
        "Total Hours on Project",
      ],
    ];
    const qExport = query(
      collection(db, "tasks"),
      orderBy("resource"),
      orderBy("date", "desc"),
      orderBy("project")
    );
    const snap = await getDocs(qExport);

    snap.forEach((docSnap) => {
      const task = docSnap.data();
      let totalTaskHours = getTotalTaskHours(task);

      // Format totalTaskHours using the new helper function
      const formattedTotalTaskHours = formatHoursToHm(totalTaskHours);

      // MODIFIED: Logic to append status to project name for CSV export
      let projectNameForCSV = task.project || "-"; // Default to project name or '-'

      if (task.status === "practicing") {
        projectNameForCSV = `${projectNameForCSV} (Practiced)`;
      } else if (task.status === "reviewing") {
        projectNameForCSV = `${projectNameForCSV} (Reviewed)`;
      } else if (task.status === "testing") {
        projectNameForCSV = `${projectNameForCSV} (Tested)`;
      }

      // Only include rows with actual time or project info
      if (totalTaskHours > 0 || task.project) {
        rows.push([
          task.date || "-",
          task.resource,
          projectNameForCSV, // Use the potentially modified project name
          formattedTotalTaskHours,
        ]);
      }
    });

    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_summary_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  });
}

// --- Live Task Rendering & Log Generation ---
const today = new Date().toISOString().split("T")[0];

// Define 'q' here, accessible by onSnapshot
// MODIFIED: Fetch all tasks, sorted by date in descending order
const q = query(collection(db, "tasks"), orderBy("date", "desc"));

let lastTaskStates = {}; // Initialized outside for persistence between snapshots

onSnapshot(q, async (snapshot) => {
  const taskTableBody = document.getElementById("taskTableBody"); // Targeting the tbody specifically
  const logContainer = document.getElementById("logContainer");
  taskTableBody.innerHTML = ""; // Clear only the tbody's content
  logContainer.innerHTML = "";

  const statusOptions = [
    "available",
    "practicing",
    "working",
    "testing",
    "reviewing",
    "completed",
  ];
  const priorityMap = {
    high: "🔴 High",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };

  // MODIFIED: Store logs by date and timestamp
  const logsByDate = {}; // This will hold logs, grouped by their date and ordered by time
  const availableUsersSet = new Set();
  const tasksForToday = [];

  snapshot.forEach((docSnap) => {
    const task = docSnap.data();
    const id = docSnap.id;

    const logEntry = {
      html: "",
      timestamp: task.lastActiveChange
        ? task.lastActiveChange.toDate().getTime()
        : new Date().getTime(), // Use lastActiveChange if available, otherwise current time
    };

    const verbMap = {
      working: "is working on",
      practicing: "is practicing",
      reviewing: "is reviewing",
      testing: "is testing",
      completed: "has completed",
    };
    let timeInfo = "";
    if (task.cumulativeTime && task.cumulativeTime.length > 0) {
      // Find the latest end time from cumulativeTime for sorting
      const latestEndTime = Math.max(
        ...task.cumulativeTime.map((t) =>
          new Date(`2000-01-01T${t.end}`).getTime()
        )
      );
      logEntry.timestamp = latestEndTime;
      timeInfo = ` (${task.cumulativeTime
        .map((t) => `${t.start} - ${t.end}`)
        .join(", ")})`;
    } else if (task.isActive) {
      if (task.lastActiveChange) {
        const startTime = new Date(task.lastActiveChange.toDate());
        logEntry.timestamp = startTime.getTime(); // Use active start time
        timeInfo = ` (Active since ${formatTime(startTime)})`;
      } else {
        timeInfo = ` (Currently active)`;
      }
    } else if (task.status === "completed" && task.lastActiveChange) {
      // For completed tasks, use the lastActiveChange as the completion time
      logEntry.timestamp = task.lastActiveChange.toDate().getTime();
    }

    if (task.status === "available") {
      logEntry.html = `<p><b>${task.resource}</b> is available${timeInfo}</p>`;
    } else if (task.status === "completed") {
      logEntry.html = `<p><b>${task.resource}</b> has completed <i>${
        task.project || "an un-named task"
      }</i>${timeInfo}</p>`;
    } else {
      const action = verbMap[task.status] || task.status;
      logEntry.html = `<p><b>${task.resource}</b> ${action} <i>${
        task.project || "an un-named task"
      }</i>${timeInfo}</p>`;
    }

    // Ensure that if a date doesn't exist yet as a key, an empty array is created
    if (!logsByDate[task.date]) {
      logsByDate[task.date] = [];
    }
    logsByDate[task.date].push(logEntry); // Push the log object with timestamp

    // Only add tasks for today to tasksForToday array for the table display
    if (task.date === today) {
      tasksForToday.push({ ...task, id });
    }
  });

  // --- Admin Notification Logic (only applies to today's tasks) ---
  if (isAdmin) {
    console.log("Current user role:", currentUser.role);

    const currentTaskStates = {};
    const completedUsers = [];
    const exceededTimeUsers = [];

    for (const task of tasksForToday) {
      // Iterate only through today's tasks for notifications
      currentTaskStates[task.id] = task.status;
      const lastStatus = lastTaskStates[task.id];

      if (
        lastStatus &&
        lastStatus !== "completed" &&
        task.status === "completed"
      ) {
        const userHasOtherActiveTasks = tasksForToday.some(
          (t) =>
            t.resource === task.resource &&
            t.id !== task.id &&
            t.status !== "completed"
        );

        if (!userHasOtherActiveTasks) {
          completedUsers.push({
            user: task.resource,
            project: task.project || "an unnamed project",
          });
        }
      }

      // Check for exceeded time for current (non-completed) tasks
      if (
        task.status !== "completed" &&
        task.expectedTime != null &&
        task.expectedTime > 0
      ) {
        const currentTotalHours = getTotalTaskHours(task);
        // Convert expectedTime (minutes) to hours for comparison
        const expectedTimeInHoursForComparison = task.expectedTime / 60;
        if (currentTotalHours > expectedTimeInHoursForComparison) {
          exceededTimeUsers.push({
            user: task.resource,
            project: task.project || "an unnamed task",
            currentHours: currentTotalHours.toFixed(2),
            expectedHours: expectedTimeInHoursForComparison.toFixed(2),
          });
        }
      }
    }

    // Display notifications for newly available users
    if (completedUsers.length > 0) {
      completedUsers.forEach(({ user, project }) => {
        const notificationMessage = `🔔 ${user} has completed "${project}" and is now available!`;
        const notificationElement = document.createElement("p");
        notificationElement.textContent = notificationMessage;
        notificationElement.classList.add(
          "notification-item",
          "notification-success"
        );

        if (adminNotificationArea) {
          adminNotificationArea.style.opacity = "1";
          adminNotificationArea.style.pointerEvents = "auto";
          adminNotificationArea.prepend(notificationElement);
          if (notificationSound) {
            notificationSound
              .play()
              .catch((e) => console.error("Error playing sound:", e));
          }
          setTimeout(() => {
            notificationElement.style.opacity = "0";
            setTimeout(() => {
              notificationElement.remove();
              if (adminNotificationArea.children.length === 0) {
                adminNotificationArea.style.opacity = "0";
                adminNotificationArea.style.pointerEvents = "none";
              }
            }, 500);
          }, 10000);
        }
      });
    }

    // Display notifications for exceeded time
    if (exceededTimeUsers.length > 0) {
      exceededTimeUsers.forEach(
        ({ user, project, currentHours, expectedHours }) => {
          const notificationMessage = `⚠️ ${user} has exceeded expected time on "${project}" (${currentHours} hrs vs ${expectedHours} hrs)!`;
          const notificationElement = document.createElement("p");
          notificationElement.textContent = notificationMessage;
          notificationElement.classList.add(
            "notification-item",
            "notification-warning"
          );

          if (adminNotificationArea) {
            adminNotificationArea.style.opacity = "1";
            adminNotificationArea.style.pointerEvents = "auto";
            adminNotificationArea.prepend(notificationElement);
            if (notificationSound) {
              notificationSound
                .play()
                .catch((e) => console.error("Error playing sound:", e));
            }
            setTimeout(() => {
              notificationElement.style.opacity = "0";
              setTimeout(() => {
                notificationElement.remove();
                if (adminNotificationArea.children.length === 0) {
                  adminNotificationArea.style.opacity = "0";
                  adminNotificationArea.style.pointerEvents = "none";
                }
              }, 500);
            }, 10000);
          }
        }
      );
    }

    if (adminNotificationArea && adminNotificationArea.children.length === 0) {
      adminNotificationArea.style.opacity = "0";
      adminNotificationArea.style.pointerEvents = "none";
    }
    lastTaskStates = currentTaskStates;
  }
  // --- End Admin Notification Logic ---

  tasksForToday.sort((a, b) => {
    if (a.resource === currentUser.name && b.resource !== currentUser.name)
      return -1;
    if (b.resource === currentUser.name && a.resource !== currentUser.name)
      return 1;
    const statusOrder = (status) => {
      if (status === "available") return 0;
      if (status === "practicing" || status === "working") return 1;
      return 2;
    };
    const statusComparison = statusOrder(a.status) - statusOrder(b.status);
    if (statusComparison !== 0) return statusComparison;
    return (a.project || "").localeCompare(b.project || "");
  });

  let currentUserNonCompletedTasksCount = tasksForToday.filter(
    (task) => task.resource === currentUser.name && task.status !== "completed"
  ).length;

  if (!isAdmin && currentUserNonCompletedTasksCount >= 2) {
    addTaskBtn.disabled = true;
    addTaskBtn.textContent = "Max Tasks reached";
  } else {
    addTaskBtn.disabled = false;
    addTaskBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Task';
  }

  let renderedNonCurrentUserRowCount = 0;

  tasksForToday.forEach((task) => {
    // Render only today's tasks in the table
    const id = task.id;
    const isUsersTask = task.resource === currentUser.name;
    const isCompleted = task.status === "completed";
    if (["available", "practicing"].includes(task.status)) {
      availableUsersSet.add(task.resource);
    }

    let shouldDisplayInTable = false;
    // Only display non-completed tasks for the current day in the main table
    if (!isCompleted && task.date === today) {
      if (isUsersTask) {
        shouldDisplayInTable = true;
      } else {
        // Logic for showing limited non-user tasks
        if (
          renderedNonCurrentUserRowCount <
          5 - currentUserNonCompletedTasksCount
        ) {
          shouldDisplayInTable = true;
          renderedNonCurrentUserRowCount++;
        }
      }
    }

    if (shouldDisplayInTable) {
      // MODIFIED: Define separate editable flags for Project and Expected Time
      const isProjectEditable = isUsersTask || isAdmin;
      const isExpectedTimeEditable = isAdmin; // Expected time remains admin-only

      const areStatusEditable = (isUsersTask && !isCompleted) || isAdmin; // User can edit own status if not completed, admin can always
      const isActivitySwitchDisabled =
        isCompleted || (!isUsersTask && !isAdmin);

      const statusDropdown = statusOptions
        .map(
          (s) =>
            `<option value="${s}" ${
              task.status === s ? "selected" : ""
            }>${s}</option>`
        )
        .join("");

      const priorityField = isAdmin
        ? `<select data-id="${id}" data-field="priority">` +
          `<option value="" ${
            !task.priority ? "selected" : ""
          } disabled>-- Select the priority --</option>` +
          `${["high", "medium", "low"]
            .map(
              (p) =>
                `<option value="${p}" ${
                  task.priority === p ? "selected" : ""
                }>${priorityMap[p]}</option>`
            )
            .join("")}` +
          `</select>`
        : `<span class="badge badge-${task.priority}">${
            priorityMap[task.priority] || "—"
          }</span>`;

      // Calculate total current hours for this task
      const currentTotalHours = getTotalTaskHours(task);
      // Compare current hours with expected time (converted from minutes to hours)
      const expectedTimeInHoursForComparison =
        task.expectedTime != null ? task.expectedTime / 60 : 0;
      const expectedTimeExceeded =
        expectedTimeInHoursForComparison > 0 &&
        currentTotalHours > expectedTimeInHoursForComparison;

      // Apply 'time-exceeded' class to the row if condition met
      const rowClass = expectedTimeExceeded ? "time-exceeded" : "";

      // Determine if Add Time button should be shown (moved to this scope)
      const showAddTimeButton =
        (isUsersTask && !task.isActive && !isCompleted) ||
        (isAdmin && !isCompleted);

      // Convert stored minutes to HH:MM for display
      const displayedExpectedTime = convertMinutesToHm(task.expectedTime);

      const row = document.createElement("tr");
      row.dataset.id = id;
      row.dataset.resource = task.resource;
      row.dataset.status = task.status;
      row.className = rowClass; // Add the class to the row

      row.innerHTML = `
      
    <td>${task.resource}</td>
    <td>
      <select data-id="${id}" data-field="status" ${
        !areStatusEditable ? "disabled" : ""
      }>
        ${statusDropdown}
      </select>
    </td>
    <td><input type="text" data-id="${id}" data-field="project" value="${
        task.project || ""
      }" ${!isProjectEditable ? "disabled" : ""} /></td>
    <td>${priorityField}</td>
    <td>
        <input type="text" data-id="${id}" data-field="expectedTime" value="${displayedExpectedTime}"
        placeholder="HH:MM" ${!isExpectedTimeEditable ? "disabled" : ""}/>
    </td>
    <td>
        ${
          expectedTimeExceeded
            ? `<p class="time-exceeded-message">Time limit exceeded!</p>`
            : ""
        }
        <div class="time-controls">
            <label class="switch">
                <input type="checkbox" data-id="${id}" data-action="toggleActivity" ${
        task.isActive ? "checked" : ""
      }
                       onchange="window.toggleActivity('${id}', ${
        task.isActive
      })"
                       ${isActivitySwitchDisabled ? "disabled" : ""}>
                <span class="slider round"></span>
            </label>
            ${
              showAddTimeButton
                ? `<button class="add-time-btn" data-id="${id}" data-segments='${JSON.stringify(
                    task.cumulativeTime || []
                  )}'><i class="fas fa-clock"></i> Add Time</button>`
                : ""
            }
        </div>
    </td>
    <td>
      ${
        isUsersTask || isAdmin
          ? isCompleted
            ? `<button onclick="window.undoComplete('${id}')">Undo</button>`
            : `<button onclick="window.deleteTask('${id}')"><i class="fas fa-trash-alt"></i></button>`
          : ""
      }
    </td>
`;

      if (taskTableBody) {
        taskTableBody.appendChild(row); // Append rows to the tbody
      }
    }
  });

  // MODIFIED: Render logs grouped by date and sorted by time within each day
  const sortedDates = Object.keys(logsByDate).sort(
    (a, b) => new Date(b) - new Date(a)
  );
  if (sortedDates.length > 0) {
    sortedDates.forEach((date) => {
      const dailySectionWrapper = document.createElement("div");
      dailySectionWrapper.classList.add("daily-log-section");

      const dateHeader = document.createElement("h3");
      dateHeader.textContent =
        date === today ? "Today's Activity" : `Activity on ${date}`;
      dailySectionWrapper.appendChild(dateHeader);

      const dailyLogsContent = document.createElement("div");
      dailyLogsContent.classList.add("daily-logs-content");

      // Sort logs for the current day by timestamp (descending: latest first)
      const sortedDailyLogs = logsByDate[date].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      sortedDailyLogs.forEach((log) => {
        dailyLogsContent.innerHTML += log.html; // Append the HTML part of the log object
      });

      dailySectionWrapper.appendChild(dailyLogsContent);
      logContainer.appendChild(dailySectionWrapper);
    });
  } else {
    logContainer.innerHTML = "<p>No activity yet.</p>";
  }

  // Admin Panel: Display available users
  if (isAdmin) {
    availableUsersPanel.style.opacity = "1";
    availableUsersPanel.style.pointerEvents = "auto";
    const list = document.getElementById("availableUsersList");
    list.innerHTML = "";

    availableUsersSet.size
      ? [...availableUsersSet].forEach((user) => {
          const li = document.createElement("li");
          li.textContent = user;
          list.appendChild(li);
        })
      : (list.innerHTML = "<li>No one available</li>");
  } else {
    if (availableUsersPanel) {
      availableUsersPanel.style.opacity = "0";
      availableUsersPanel.style.pointerEvents = "none";
    }
  }
});
