document.getElementById("darkModeToggle").addEventListener("change", (e) => {
  const isDark = e.target.checked;
  document.body.classList.toggle("dark", isDark);
  document
    .getElementById("availableUsersPanel")
    ?.classList.toggle("dark", isDark);
});

// const isAdmin = currentUser.role === "admin";
// document.getElementById("userName").textContent = currentUser.name;

// // Add this line:
// if (isAdmin) {
//   document.body.classList.add("admin-mode");
// }

document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".custom-select-trigger");
  const option = e.target.closest(".custom-option");

  // Open/close dropdown
  if (trigger) {
    const parent = trigger.parentElement;
    document
      .querySelectorAll(".custom-select")
      .forEach((sel) => sel !== parent && sel.classList.remove("open"));
    parent.classList.toggle("open");
  }

  // Select option
  if (option) {
    const parent = option.closest(".custom-select");
    const triggerEl = parent.querySelector(".custom-select-trigger");
    triggerEl.textContent = option.textContent;

    // Update selected styling
    parent
      .querySelectorAll(".custom-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    parent.classList.remove("open");
    parent.setAttribute("data-value", option.dataset.value);

    // ✅ Simulate the same logic as select change
    const id = parent.dataset.id;
    const field = parent.dataset.field;
    console.log(`Changed ${field} for ID ${id} to ${option.dataset.value}`);
    // ➡️ Here you can trigger your existing save/update function
  }
});

// Close on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".custom-select")) {
    document
      .querySelectorAll(".custom-select")
      .forEach((sel) => sel.classList.remove("open"));
  }
});
