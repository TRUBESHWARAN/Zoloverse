document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById("statusMessage");
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    statusDiv.className = "status-msg error";
    statusDiv.textContent = "Passwords do not match.";
    statusDiv.style.display = "block";
    return;
  }

  try {
    const res = await fetch("api/auth.php?action=register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password
      })
    });
    const data = await res.json();

    if (data.success) {
      statusDiv.className = "status-msg success";
      statusDiv.textContent = "Account created! Redirecting to sign in...";
      statusDiv.style.display = "block";
      setTimeout(() => { window.location.href = "login.html"; }, 1800);
    } else {
      statusDiv.className = "status-msg error";
      statusDiv.textContent = data.message;
      statusDiv.style.display = "block";
    }
  } catch (err) {
    statusDiv.className = "status-msg error";
    statusDiv.textContent = "Unable to connect. Please try again.";
    statusDiv.style.display = "block";
  }
});