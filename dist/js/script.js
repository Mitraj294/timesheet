document.addEventListener("DOMContentLoaded", function () {
    // Sidebar Toggle
    const menuButton = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");

    menuButton.addEventListener("click", function (event) {
        event.stopPropagation();
        sidebar.classList.toggle("open");
    });

    // Close sidebar when clicking outside
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("open");
        }
    });

    // User Dropdown Toggle
    const userButton = document.getElementById("userButton");
    const userDropdown = document.getElementById("userDropdown");

    userButton.addEventListener("click", function (event) {
        event.stopPropagation();
        userDropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (event) {
        if (!userButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove("show");
        }
    });
});
