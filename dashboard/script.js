// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "AIzaSyA9diwq9UcvJwFOCRl_bPlCZTAMclH7TgA",
  authDomain: "smart-bin-management-7fce0.firebaseapp.com",
  databaseURL: "https://smart-bin-management-7fce0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-bin-management-7fce0",
  storageBucket: "smart-bin-management-7fce0.firebasestorage.app",
  messagingSenderId: "474334349092",
  appId: "1:474334349092:web:1a5d84d3061256d44dd5b1",
  measurementId: "G-E7F6J6XCNZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const auth = firebase.auth();

// ==== UI Toggles ====
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const errorEl = document.getElementById("auth-error");

document.getElementById("show-register").addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    formTitle.innerText = "Create Account";
    formSubtitle.innerText = "Sign up to monitor your Smart Bin.";
    errorEl.innerText = "";
});

document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
    formTitle.innerText = "Smart Bin Login";
    formSubtitle.innerText = "Welcome back! Please login to your account.";
    errorEl.innerText = "";
});

// ==== Enter Key Support ====
function addEnterKeyHandler(inputId, buttonId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById(buttonId).click();
            }
        });
    }
}

// Login Inputs -> Login Button
addEnterKeyHandler("email", "login-btn");
addEnterKeyHandler("password", "login-btn");

// Register Inputs -> Register Button
addEnterKeyHandler("reg-email", "register-btn");
addEnterKeyHandler("reg-password", "register-btn");
addEnterKeyHandler("reg-confirm-password", "register-btn");

// ==== Auth Logic ====

// 1. Login
document.getElementById("login-btn").addEventListener("click", () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    errorEl.innerText = "";

    if (!email || !password) {
        errorEl.innerText = "Please fill in all fields.";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch(handleAuthError);
});

// 2. Register
document.getElementById("register-btn").addEventListener("click", () => {
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const confirmPassword = document.getElementById("reg-confirm-password").value.trim();

    errorEl.innerText = "";

    if (!email || !password || !confirmPassword) {
        errorEl.innerText = "Please fill in all fields.";
        return;
    }

    if (password !== confirmPassword) {
        errorEl.innerText = "Passwords do not match.";
        return;
    }

    if (password.length < 6) {
        errorEl.innerText = "Password must be at least 6 characters.";
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .catch(handleAuthError);
});

// 3. Logout
document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut();
});

// Helper: Handle Errors
function handleAuthError(error) {
    let message = "Authentication failed.";
    switch (error.code) {
        case "auth/email-already-in-use":
            message = "This email is already registered.";
            break;
        case "auth/invalid-email":
            message = "Invalid email address format.";
            break;
        case "auth/weak-password":
            message = "Password should be at least 6 characters.";
            break;
        case "auth/user-not-found":
        case "auth/wrong-password":
            message = "Invalid email or password.";
            break;
        default:
            message = error.message;
    }
    errorEl.innerText = message;
}

// Observe login state
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("login-wrapper").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
    } else {
        document.getElementById("login-wrapper").style.display = "flex";
        document.getElementById("dashboard").style.display = "none";

        // ==== Reset to Clean Login State ====
        // 1. Reset View to Login
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        formTitle.innerText = "Smart Bin Login";
        formSubtitle.innerText = "Welcome back! Please login to your account.";
        
        // 2. Clear Errors
        errorEl.innerText = "";

        // 3. Clear Input Fields
        const inputs = document.querySelectorAll("input");
        inputs.forEach(input => input.value = "");
    }
});


// ==== Notification Setup ====
const startTime = Date.now(); // Track when dashboard opened to avoid notifying for old logs

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

function sendNotification(title, body, icon) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: icon || "https://cdn-icons-png.flaticon.com/512/1040/1040230.png" // Generic alert icon
    });
  }
}

// Request permission immediately
requestNotificationPermission();

// ==== Chart.js Setup ====
const ctx = document.getElementById('fillChart').getContext('2d');

// Gradient for the chart
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(78, 115, 223, 0.5)');
gradient.addColorStop(1, 'rgba(78, 115, 223, 0.0)');

const fillChart = new Chart(ctx, {
  type: 'line',
  data: { 
      labels: [], 
      datasets: [{ 
          label: 'Fill Level (%)', 
          data: [], 
          borderColor: '#4e73df',
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#4e73df',
          fill: true,
          tension: 0.4 // Smooth curves
      }] 
  },
  options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
          legend: {
              display: true,
              position: 'top',
          }
      },
      scales: { 
          y: { 
              beginAtZero: true, 
              max: 100,
              grid: {
                  borderDash: [2, 2]
              }
          },
          x: {
              grid: {
                  display: false
              }
          }
      } 
  }
});

// ==== Real-time Firebase Listener ====
const logsRef = db.ref('Logs'); 

logsRef.limitToLast(50).on('child_added', (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // --- Update UI Elements ---
  
  // 1. Fill Level
  const fillLevel = data.binDistance;
  const fillEl = document.getElementById('fillLevel');
  fillEl.innerText = fillLevel + '%';
  
  // Color code fill level
  if(fillLevel > 80) fillEl.className = 'text-danger';
  else if(fillLevel > 50) fillEl.className = 'text-warning';
  else fillEl.className = 'text-primary';

  // 2. Lid Status
  const isLidOpen = data.handDistance <= 15;
  const lidEl = document.getElementById('lidStatus');
  const lidIcon = document.getElementById('lidIcon');
  
  lidEl.innerText = isLidOpen ? 'OPEN' : 'CLOSED';
  lidEl.className = isLidOpen ? 'text-warning' : 'text-success';
  
  lidIcon.className = isLidOpen ? 'fas fa-door-open' : 'fas fa-door-closed';
  lidIcon.parentElement.className = isLidOpen ? 'card-icon text-warning' : 'card-icon text-success';

  // 3. Fire Status
  const isFireDanger = data.flameValue < 400;
  const fireEl = document.getElementById('fireStatus');
  const fireIcon = document.getElementById('fireIcon');

  fireEl.innerText = isFireDanger ? 'DANGER' : 'SAFE';
  fireEl.className = isFireDanger ? 'text-danger' : 'text-success';
  
  fireIcon.className = isFireDanger ? 'fas fa-fire' : 'fas fa-fire-extinguisher';
  fireIcon.parentElement.className = isFireDanger ? 'card-icon text-danger' : 'card-icon text-success';

  // --- Notifications ---
  // Only notify for new events (timestamp > startTime)
  const logTime = new Date(data.timestamp).getTime();
  
  if (logTime > startTime) {
      // Check Fire Status
      if (isFireDanger) {
          sendNotification("🔥 FIRE ALERT!", "Fire detected in the Smart Bin! Immediate action required.");
      }
      
      // Check Fill Level (>= 90%)
      if (fillLevel >= 90) {
          sendNotification("🗑️ Bin Full Alert", `Fill level is at ${fillLevel}%. Please empty the bin.`);
      }
  }

  // --- Update Chart ---
  const timeLabel = new Date(data.timestamp).toLocaleTimeString();
  
  // Keep chart from getting too crowded (max 20 points)
  if (fillChart.data.labels.length > 20) {
      fillChart.data.labels.shift();
      fillChart.data.datasets[0].data.shift();
  }

  fillChart.data.labels.push(timeLabel);
  fillChart.data.datasets[0].data.push(fillLevel);
  fillChart.update();

  // --- Update Log Table ---
  const logRow = document.createElement('tr');
  const dateStr = new Date(data.timestamp).toLocaleString();
  const statusBadge = isFireDanger 
      ? '<span style="background:#e74a3b; color:white; padding:2px 8px; border-radius:4px; font-size:0.8em;">FIRE DETECTED</span>' 
      : '<span style="background:#1cc88a; color:white; padding:2px 8px; border-radius:4px; font-size:0.8em;">Normal</span>';
  
  logRow.innerHTML = `
      <td>${dateStr}</td>
      <td>${statusBadge}</td>
      <td>Flame Value: ${data.flameValue}</td>
  `;
  
  const logBody = document.getElementById('fireLog');
  logBody.prepend(logRow);
  
  // Limit table rows to 10
  if (logBody.children.length > 10) {
      logBody.removeChild(logBody.lastChild);
  }
});