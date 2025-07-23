// js/utils.js

// Function to convert HH:MM string to total minutes
const convertHmToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  return 0;
};

// Function to convert minutes to HH:MM format
const convertMinutesToHm = (totalMinutes) => {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes < 0)
    return "00:00";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Function to calculate total task hours (in hours)
const getTotalTaskHours = (task) => {
  let totalMinutes = 0;
  if (task.isActive && task.lastActiveChange) {
    const startTime = task.lastActiveChange.toDate();
    const now = new Date();
    totalMinutes += (now.getTime() - startTime.getTime()) / (1000 * 60);
  }

  if (task.cumulativeTime && task.cumulativeTime.length > 0) {
    task.cumulativeTime.forEach((segment) => {
      if (segment.start && segment.end) {
        const start = parseTimeStrToDate(segment.start);
        const end = parseTimeStrToDate(segment.end);
        if (start && end) {
          totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        }
      }
    });
  }
  return totalMinutes / 60; // Return in hours
};

// Helper to parse time string (HH:MM AM/PM) to a Date object
const parseTimeStrToDate = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!parts) return null;

  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const period = parts[3] ? parts[3].toUpperCase() : null;

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const date = new Date(); // Use current date, only time matters
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// New helper for sorting, preserving date context for sorting
const parseTimeStrToDateForSorting = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!parts) return null;

  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const period = parts[3] ? parts[3].toUpperCase() : null;

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  // Create a date object, we'll use today's date but the time will be accurate
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Function to format time for display (e.g., 10:30 AM)
const formatTime = (dateObj) => {
  if (!dateObj) return "";
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minStr = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
};

// Convert decimal hours to HH:MM format for display in CSV
const formatHoursToHm = (decimalHours) => {
  if (decimalHours == null || isNaN(decimalHours) || decimalHours < 0)
    return "00:00";
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Helper function to format date from YYYY-MM-DD to DD-MM-YYYY for log heading
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString; // Return original if format is unexpected
};

// ✅ Convert decimal hours to "X Hours Y Mins" for CSV
const formatHoursToReadable = (decimalHours) => {
  if (!decimalHours || isNaN(decimalHours) || decimalHours <= 0)
    return "0 Hours 0 Mins";

  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  let result = "";
  if (h > 0) {
    result += `${h} Hour${h > 1 ? "s" : ""}`;
  }
  if (m > 0) {
    if (result) result += " ";
    result += `${m} Min${m > 1 ? "s" : ""}`;
  }
  return result || "0 Hours 0 Mins";
};

// Debounce function (limits how often a function can be called)
const debounce = (func, delay) => {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

// Calculate duration between two Date objects in hours
const calculateDurationInHours = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

export {
  convertHmToMinutes,
  getTotalTaskHours,
  parseTimeStrToDate,
  parseTimeStrToDateForSorting,
  formatTime,
  convertMinutesToHm,
  formatHoursToHm,
  formatDateForDisplay,
  formatHoursToReadable,
  debounce,
  calculateDurationInHours,
};
