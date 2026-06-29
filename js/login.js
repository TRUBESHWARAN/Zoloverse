const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect") || "index.html";

async function initGoogleSignIn() {
  try {
    const res = await fetch("api/auth.php?action=config");
    const config = await res.json();
    const googleClientId = config.google_client_id;

    if (!googleClientId || googleClientId.includes("YOUR_GOOGLE_CLIENT_ID")) {
      document.getElementById("googleSetupWarning").style.display = "block";
      return;
    }

    document.getElementById("googleSection").style.display = "block";

    const setupGoogle = () => {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignInResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", text: "signin_with", width: 368, shape: "rectangular" }
      );
      google.accounts.id.prompt();
    };

    if (typeof google !== "undefined") {
      setupGoogle();
    } else {
      // SDK might still be loading async
      const checkInterval = setInterval(() => {
        if (typeof google !== "undefined") {
          clearInterval(checkInterval);
          setupGoogle();
        }
      }, 100);
    }
  } catch (e) {
    console.error("Failed to load Google configuration:", e);
  }
}

async function handleGoogleSignInResponse(response) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "none";

  try {
    const res = await fetch("api/auth.php?action=google_login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("zoloverse_token", data.token);
      localStorage.setItem("zoloverse_user", JSON.stringify(data.user));
      if (redirect === "admin.html" && data.user.role !== "admin") {
        errorDiv.textContent = "This account does not have admin access.";
        errorDiv.style.display = "block";
        localStorage.removeItem("zoloverse_token");
        localStorage.removeItem("zoloverse_user");
      } else {
        window.location.href = redirect;
      }
    } else {
      errorDiv.textContent = data.message || "Google Authentication failed.";
      errorDiv.style.display = "block";
    }
  } catch (err) {
    errorDiv.textContent = "Unable to connect to login server.";
    errorDiv.style.display = "block";
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Signing in...";

  try {
    const res = await fetch("api/auth.php?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("zoloverse_token", data.token);
      localStorage.setItem("zoloverse_user", JSON.stringify(data.user));
      if (redirect === "admin.html" && data.user.role !== "admin") {
        errorDiv.textContent = "This account does not have admin access.";
        errorDiv.style.display = "block";
        localStorage.removeItem("zoloverse_token");
        localStorage.removeItem("zoloverse_user");
      } else {
        window.location.href = redirect;
      }
    } else {
      errorDiv.textContent = data.message || "Invalid email or password.";
      errorDiv.style.display = "block";
    }
  } catch (err) {
    errorDiv.textContent = "Unable to connect. Please check your server is running.";
    errorDiv.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});

// Start Google Auth initialization
initGoogleSignIn();