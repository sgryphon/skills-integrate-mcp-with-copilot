document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminIcon = document.getElementById("admin-icon");
  const adminMenu = document.getElementById("admin-menu");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const adminStatus = document.getElementById("admin-status");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const signupContainer = document.getElementById("signup-container");
  const signupButton = signupForm.querySelector("button[type='submit']");

  const auth = {
    token: localStorage.getItem("teacherToken"),
    username: localStorage.getItem("teacherUser"),
  };

  function isAdmin() {
    return Boolean(auth.token);
  }

  function updateAdminUI() {
    if (isAdmin()) {
      adminStatus.textContent = `Teacher Mode: ${auth.username}`;
      loginButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
      signupForm.classList.remove("disabled-form");
      signupContainer.classList.remove("disabled-form");
      signupButton.disabled = false;
    } else {
      adminStatus.textContent = "Student Mode";
      loginButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
      signupForm.classList.add("disabled-form");
      signupContainer.classList.add("disabled-form");
      signupButton.disabled = true;
    }
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    if (isAdmin()) {
                      return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`;
                    }
                    return `<li><span class="participant-email">${email}</span></li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (isAdmin()) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: isAdmin() ? { Authorization: `Bearer ${auth.token}` } : {},
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }

    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: isAdmin() ? { Authorization: `Bearer ${auth.token}` } : {},
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminIcon.addEventListener("click", () => {
    adminMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!adminMenu.contains(event.target) && event.target !== adminIcon) {
      adminMenu.classList.add("hidden");
    }
  });

  loginButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        auth.token = result.token;
        auth.username = result.username;
        localStorage.setItem("teacherToken", auth.token);
        localStorage.setItem("teacherUser", auth.username);
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateAdminUI();
        fetchActivities();
        showMessage("Logged in successfully.", "success");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    auth.token = null;
    auth.username = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUser");
    updateAdminUI();
    fetchActivities();
    showMessage("Logged out.", "info");
  });

  // Initialize app
  updateAdminUI();
  fetchActivities();
});
