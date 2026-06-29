// auth.js — Session management & route protection

const API_BASE = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'api/';

document.addEventListener("DOMContentLoaded", () => {
    applyAuthState();
    protectRoutes();
});

function getToken() {
    return localStorage.getItem("zoloverse_token");
}

function getUser() {
    const raw = localStorage.getItem("zoloverse_user");
    return raw ? JSON.parse(raw) : null;
}

function getAuthHeaders() {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["X-Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

function isAdmin() {
    const user = getUser();
    return user && user.role === "admin";
}

function applyAuthState() {
    const token = getToken();
    const user = getUser();
    const navLinks = document.querySelector(".nav-links");
    const container = document.getElementById("navUserContainer");
    const badge = document.getElementById("navUserBadge");

    const existingAuth = document.getElementById("dynamicAuthLink");
    if (existingAuth) existingAuth.remove();

    if (token && user) {
        if (navLinks && user.role === "admin") {
            const li = document.createElement("li");
            li.id = "dynamicAuthLink";
            li.innerHTML = `<a href="admin.html" class="nav-item" style="color:var(--neon-bright)">Admin</a>`;
            navLinks.appendChild(li);
        }
        if (badge) {
            badge.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${user.name}</span>
            `;
        }
        if (container) {
            container.classList.remove("hidden");
        }
    } else {
        if (navLinks) {
            const li = document.createElement("li");
            li.id = "dynamicAuthLink";
            li.innerHTML = `<a href="login.html" class="nav-item" style="color:var(--neon-accent)">Sign In</a>`;
            navLinks.appendChild(li);
        }
        if (container) {
            container.classList.add("hidden");
        }
        if (badge) {
            badge.innerHTML = "";
        }
    }
}

function protectRoutes() {
    const page = window.location.pathname.split("/").pop();
    const token = getToken();
    const user = getUser();

    if (page === "admin.html") {
        if (!token || !user) {
            window.location.href = "login.html?redirect=admin.html";
            return;
        }
        if (user.role !== "admin") {
            alert("Admin access required. Please sign in with an administrator account.");
            window.location.href = "login.html?redirect=admin.html";
            return;
        }
        injectAdminLogout();
    }
}

function injectAdminLogout() {
    const header = document.querySelector(".header-bar");
    if (!header || document.getElementById("adminLogoutBtn")) return;

    const user = getUser();
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; align-items:center; gap:16px;";
    wrap.innerHTML = `
        <span style="color:var(--text-muted); font-size:0.9rem;">${user?.name || "Admin"}</span>
        <button id="adminLogoutBtn" class="btn btn-secondary" style="padding:10px 18px;" onclick="executeLogout()">
            <i class="fas fa-sign-out-alt"></i> Sign Out
        </button>`;
    header.appendChild(wrap);
}

function executeLogout() {
    localStorage.removeItem("zoloverse_token");
    localStorage.removeItem("zoloverse_user");
    window.location.href = "login.html";
}

async function verifySession() {
    const token = getToken();
    if (!token) return false;
    try {
        const res = await fetch(`${API_BASE}auth.php?action=verify`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                "X-Authorization": `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.valid) {
            localStorage.setItem("zoloverse_user", JSON.stringify(data.user));
            return true;
        }
    } catch (e) { /* session invalid */ }
    executeLogout();
    return false;
}
