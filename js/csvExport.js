// js/csvExport.js
import { getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getTasksQuery } from "./firestoreOperations.js"; // ✅ Firestore query for export
import { isAdmin } from "./auth.js"; // ✅ Check admin role
import { getTotalTaskHours, formatHoursToReadable } from "./utils.js";

const exportCSVBtn = document.getElementById("exportCSVBtn");

/**
 * Sets up the CSV Export button functionality.
 */
const setupCsvExport = () => {
  if (!exportCSVBtn) return; // Ensure button exists

  exportCSVBtn.addEventListener("click", async () => {
    if (!isAdmin) {
      alert("Only admins can export logs.");
      return;
    }

    try {
      const rows = [
        ["Date", "Resource", "Project Name", "Total Hours on Project"], // CSV Header
      ];

      // ✅ Fetch all tasks ordered by date
      const snap = await getDocs(getTasksQuery("date", "desc"));

      if (snap.empty) {
        alert("No tasks found to export.");
        return;
      }

      snap.forEach((docSnap) => {
        const task = docSnap.data();
        const totalTaskHours = getTotalTaskHours(task);
        const formattedTotalTaskHours = formatHoursToReadable(totalTaskHours);

        // Build Project Name string with status context
        let projectNameForCSV = task.project || "-";
        if (task.status === "practicing") projectNameForCSV += " (Practiced)";
        else if (task.status === "reviewing")
          projectNameForCSV += " (Reviewed)";
        else if (task.status === "testing") projectNameForCSV += " (Tested)";

        // Push only relevant rows (skip empty ones)
        if (totalTaskHours > 0 || task.project) {
          rows.push([
            task.date || "-",
            task.resource || "-",
            projectNameForCSV,
            formattedTotalTaskHours,
          ]);
        }
      });

      // ✅ Generate CSV String
      const csv = rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      // ✅ Download CSV (with BOM for Excel compatibility)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tasks_summary_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Check console for details.");
    }
  });
};

export { setupCsvExport };
