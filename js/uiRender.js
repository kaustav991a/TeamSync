// js/uiRender.js
import { currentUser, isAdmin } from "./auth.js";
import {
  getTotalTaskHours,
  convertMinutesToHm,
  parseTimeStrToDateForSorting,
  formatTime,
  formatDateForDisplay,
} from "./utils.js"; // All utility imports from utils.js

const taskTableBody = document.getElementById("taskTableBody");
const logContainer = document.getElementById("logContainer");
const adminNotificationArea = document.getElementById("adminNotificationArea");
const availableUsersPanel = document.getElementById("availableUsersPanel");
const availableUsersList = document.getElementById("availableUsersList");
const addTaskBtn = document.getElementById("addTaskBtn"); // Already here, but ensure consistency

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

const lastTaskStates = {}; // To track previous states for notifications
let notificationTimeoutId; // ADD THIS LINE: To store the timeout ID

// ============================
// Process Task Data
// ============================
const _processTaskData = (tasksArray, today) => {
  const logsByDate = {};
  const availableUsersSet = new Set();
  const tasksForTable = []; // Renamed from tasksForToday to reflect it will hold all non-completed tasks
  const currentTaskStates = {};

  tasksArray.forEach((task) => {
    const id = task.id;
    const taskDate = task.date;

    // Track state changes for admin notifications
    if (isAdmin && taskDate === today) {
      lastTaskStates[id] = lastTaskStates[id] || task.status; // Initialize if not set
      currentTaskStates[id] = task.status;
    }

    const logEntry = {
      html: "",
      timestamp: task.lastActiveChange
        ? task.lastActiveChange.toDate().getTime()
        : new Date().getTime(), // Default to current time if no active change
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
      // Find the latest end time among cumulative segments for sorting logs
      const latestEndTime = Math.max(
        ...task.cumulativeTime
          .map((t) => {
            const parsedDate = parseTimeStrToDateForSorting(t.end);
            return parsedDate ? parsedDate.getTime() : NaN;
          })
          .filter((ts) => !isNaN(ts))
      );
      if (isFinite(latestEndTime)) {
        logEntry.timestamp = latestEndTime;
      }
      timeInfo = ` (${task.cumulativeTime
        .map((t) => `${t.start} - ${t.end}`)
        .join(", ")})`;
    } else if (task.isActive && task.lastActiveChange) {
      const startTime = task.lastActiveChange.toDate();
      logEntry.timestamp = startTime.getTime();
      timeInfo = ` (Active since ${formatTime(startTime)})`;
    }

    // Always add to logs, regardless of status
    if (task.status === "available") {
      logEntry.html = `<p><b>${task.resource}</b> is available${timeInfo}</p>`;
    } else if (task.status === "completed") {
      logEntry.html = `<p><b>${task.resource}</b> has completed <i>${
        task.project || "an unnamed task"
      }</i>${timeInfo}</p>`;
    } else {
      const action = verbMap[task.status] || task.status; // Fallback to status if no verb
      logEntry.html = `<p><b>${task.resource}</b> ${action} <i>${
        task.project || "an unnamed task"
      }</i>${timeInfo}</p>`;
    }

    if (!logsByDate[taskDate]) logsByDate[taskDate] = [];
    logsByDate[taskDate].push(logEntry);

    // Populate available users for today (ONLY if their status is 'available')
    if (
      task.status === "available" ||
      (task.status === "practicing" && taskDate === today)
    ) {
      // MODIFIED LINE
      availableUsersSet.add(task.resource);
    }

    // Add task to table ONLY IF NOT COMPLETED (regardless of date)
    if (task.status !== "completed") {
      tasksForTable.push({ ...task, id });
    }
  });

  return { tasksForTable, logsByDate, availableUsersSet, currentTaskStates };
};

// ============================
// Render Task Table
// ============================
const _renderTaskTable = (tasksForTable, currentUser, isAdmin) => {
  taskTableBody.innerHTML = "";
  // Sort by date (descending) then resource name (ascending)
  tasksForTable.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime(); // Latest date first
    }
    return a.resource.localeCompare(b.resource); // Then by resource name
  });

  tasksForTable.forEach((task) => {
    const id = task.id;
    const isUsersTask =
      currentUser &&
      task.resource.toLowerCase() === currentUser.name.toLowerCase();
    const areStatusEditable = isUsersTask || isAdmin;
    const isProjectEditable = isUsersTask || isAdmin;
    const isExpectedTimeEditable = isAdmin;

    const statusDropdown = statusOptions
      .map(
        (s) =>
          `<option value="${s}" ${
            task.status === s ? "selected" : ""
          }>${s}</option>`
      )
      .join("");

    // Priority field: dropdown for admin, badge for user
    const priorityField = isAdmin
      ? `<select id="priority-${id}" name="priority-${id}" data-id="${id}" data-field="priority">
            <option value="" ${
              !task.priority ? "selected" : ""
            } disabled>-- Select Priority --</option>
            ${["high", "medium", "low"]
              .map(
                (p) =>
                  `<option value="${p}" ${
                    task.priority === p ? "selected" : ""
                  }>${priorityMap[p]}</option>`
              )
              .join("")}
          </select>`
      : `<span class="badge badge-${task.priority}">${
          priorityMap[task.priority] || "—"
        }</span>`;

    // Expected Time field: input for admin, text for user
    const displayedExpectedTime = convertMinutesToHm(task.expectedTime);
    const expectedTimeField = isAdmin
      ? `<input type="text" value="${
          displayedExpectedTime || ""
        }" data-id="${id}" data-field="expectedTime" placeholder="HH:MM" class="time-input">`
      : `<span class="time-display">${displayedExpectedTime || "—"}</span>`;

    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td>${task.resource}</td>
      <td>
        ${
          areStatusEditable
            ? `<select data-id="${id}" data-field="status">${statusDropdown}</select>`
            : `<span class="badge badge-${task.status}">${task.status}</span>`
        }
      </td>
      <td>
        ${
          isProjectEditable
            ? `<input type="text" value="${
                task.project || ""
              }" data-id="${id}" data-field="project">`
            : `<span>${task.project || "—"}</span>`
        }
      </td>
      <td>${priorityField}</td>
      <td>${expectedTimeField}</td>
      <td>
        ${
          getTotalTaskHours(task)
            ? `${getTotalTaskHours(task).toFixed(2)} Hrs`
            : ""
        }
        ${
          // ONLY show toggle for the user's *own* task, and only if NOT completed
          isUsersTask && task.status !== "completed"
            ? `<label class="switch" style="margin-left: 10px;">
                <input type="checkbox" data-id="${id}" data-action="toggleActivity" ${
                task.isActive ? "checked" : ""
              }>
                <span class="slider round"></span>
              </label>`
            : ""
        }
      </td>
      <td>
        ${
          // Delete button visible if it's the user's task OR if it's an admin
          isUsersTask || isAdmin
            ? `<button class="delete-task-btn" data-id="${id}"><i class="fas fa-trash-alt"></i></button>`
            : ""
        }
      </td>
    `;
    taskTableBody.appendChild(row);
  });
};

// ============================\
// Render Logs & Admin Panels
// ============================
const _renderActivityLogs = (
  logsByDate,
  today,
  isAdmin,
  availableUsersSet,
  currentTaskStates,
  tasksArray
) => {
  logContainer.innerHTML = "";
  const sortedDates = Object.keys(logsByDate).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  sortedDates.forEach((date) => {
    const section = document.createElement("div");
    section.classList.add("daily-log-section");

    const dateHeader = document.createElement("h3");
    dateHeader.textContent =
      date === today
        ? "Today's Activity"
        : `Activity on ${formatDateForDisplay(date)}`;
    section.appendChild(dateHeader);

    const dailyLogsContent = document.createElement("div");
    dailyLogsContent.classList.add("daily-logs-content");

    logsByDate[date]
      .sort((a, b) => b.timestamp - a.timestamp) // Sort logs within the day by timestamp (latest first)
      .forEach((log) => {
        dailyLogsContent.innerHTML += log.html;
      });

    section.appendChild(dailyLogsContent);
    logContainer.appendChild(section);
  });

  // Admin Panel: Display available users
  if (isAdmin) {
    if (availableUsersPanel) {
      availableUsersPanel.style.opacity = "1";
      availableUsersPanel.style.pointerEvents = "auto";
    }
    if (availableUsersList) {
      availableUsersList.innerHTML = "";
      availableUsersSet.size
        ? [...availableUsersSet].forEach((user) => {
            const li = document.createElement("li");
            li.textContent = user;
            availableUsersList.appendChild(li);
          })
        : (availableUsersList.innerHTML = "<li>No one available</li>");
    }

    // Admin Notification Area (for status changes)
    if (isAdmin && adminNotificationArea) {
      // Ensure isAdmin check is here too
      let notificationHtml = "";
      const tasksForTodayFiltered = tasksArray.filter(
        (task) => task.date === today
      );
      for (const id in currentTaskStates) {
        if (
          lastTaskStates[id] &&
          lastTaskStates[id] !== currentTaskStates[id]
        ) {
          const changedTask = tasksForTodayFiltered.find(
            (task) => task.id === id
          );
          if (changedTask) {
            notificationHtml += `<p><b>${changedTask.resource}</b> changed status from <em>${lastTaskStates[id]}</em> to <em>${currentTaskStates[id]}</em></p>`;
          }
        }
      }

      if (notificationHtml) {
        // Clear any existing timeout to prevent premature hiding of new notifications
        if (notificationTimeoutId) {
          clearTimeout(notificationTimeoutId);
        }

        adminNotificationArea.style.opacity = "1";
        adminNotificationArea.style.pointerEvents = "auto";
        adminNotificationArea.innerHTML = `<h4><i class="fas fa-bell"></i> Status Changes Today</h4>${notificationHtml}`;

        // Set a timeout to hide the notification after 10 seconds (adjust as needed)
        notificationTimeoutId = setTimeout(() => {
          adminNotificationArea.style.opacity = "0";
          adminNotificationArea.style.pointerEvents = "none";
          adminNotificationArea.innerHTML = ""; // Clear content as well
        }, 10000); // 10000 milliseconds = 10 seconds
      } else {
        // If no new notification, ensure it's hidden and clear any lingering timeout
        if (notificationTimeoutId) {
          clearTimeout(notificationTimeoutId);
          notificationTimeoutId = null;
        }
        adminNotificationArea.style.opacity = "0";
        adminNotificationArea.style.pointerEvents = "none";
        adminNotificationArea.innerHTML = "";
      }
      Object.assign(lastTaskStates, currentTaskStates);
    } else if (!isAdmin && adminNotificationArea) {
      // Handle case where admin logs out or initial load for non-admin
      if (notificationTimeoutId) {
        clearTimeout(notificationTimeoutId);
        notificationTimeoutId = null;
      }
      adminNotificationArea.style.opacity = "0";
      adminNotificationArea.style.pointerEvents = "none";
      adminNotificationArea.innerHTML = "";
    }
  } else {
    // Hide admin panels if not admin
    if (adminNotificationArea) {
      adminNotificationArea.style.opacity = "0";
      adminNotificationArea.style.pointerEvents = "none";
    }
    if (availableUsersPanel) {
      availableUsersPanel.style.opacity = "0";
      availableUsersPanel.style.pointerEvents = "none";
    }
  }
};

// Main render function
const renderTasksAndLogs = async (tasksArray) => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { tasksForTable, logsByDate, availableUsersSet, currentTaskStates } =
    _processTaskData(tasksArray, today);

  _renderTaskTable(tasksForTable, currentUser, isAdmin);
  _renderActivityLogs(
    logsByDate,
    today,
    isAdmin,
    availableUsersSet,
    currentTaskStates,
    tasksArray
  );
};

export { renderTasksAndLogs };
