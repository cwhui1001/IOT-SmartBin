// ==== ThingSpeak Config ====
const THINGSPEAK_CHANNEL_ID   = "3206972";   
const THINGSPEAK_READ_API_KEY = "9N4F0E021PUW0LGR"; 

// ==== Firebase Config (For Authentication ONLY) ====
const firebaseConfig = {
  apiKey: "AIzaSyA9diwq9UcvJwFOCRl_bPlCZTAMclH7TgA",
  authDomain: "smart-bin-management-7fce0.firebaseapp.com",
  projectId: "smart-bin-management-7fce0",
  storageBucket: "smart-bin-management-7fce0.firebasestorage.app",
  messagingSenderId: "474334349092",
  appId: "1:474334349092:web:1a5d84d3061256d44dd5b1",
  measurementId: "G-E7F6J6XCNZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
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

addEnterKeyHandler("email", "login-btn");
addEnterKeyHandler("password", "login-btn");
addEnterKeyHandler("reg-email", "register-btn");
addEnterKeyHandler("reg-password", "register-btn");
addEnterKeyHandler("reg-confirm-password", "register-btn");

// ==== Auth Logic (Real Firebase Auth) ====

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
        case "auth/email-already-in-use": message = "This email is already registered."; break;
        case "auth/invalid-email": message = "Invalid email address format."; break;
        case "auth/weak-password": message = "Password should be at least 6 characters."; break;
        case "auth/user-not-found":
        case "auth/wrong-password": message = "Invalid email or password."; break;
        default: message = error.message;
    }
    errorEl.innerText = message;
}

// Observe login state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        document.getElementById("login-wrapper").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        
        // Start fetching ThingSpeak Data
        startFetchingData();
    } else {
        // User is signed out.
        document.getElementById("login-wrapper").style.display = "flex";
        document.getElementById("dashboard").style.display = "none";

        // Reset UI
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        formTitle.innerText = "Smart Bin Login";
        formSubtitle.innerText = "Welcome back! Please login to your account.";
        errorEl.innerText = "";
        document.querySelectorAll("input").forEach(input => input.value = "");
    }
});


// ==== Notification Setup ====
const startTime = Date.now(); 

function requestNotificationPermission() {
  if (!("Notification" in window)) {
      console.log("Browser does not support notifications.");
      return;
  }
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("Smart Bin", { body: "Notifications enabled!" });
        }
    });
  }
}

// Request permission on any click (browsers block auto-requests)
document.addEventListener('click', requestNotificationPermission, { once: true });

function sendNotification(title, body, icon) {
  console.log("Attempting to notify:", title); // Debug Log
  
  if (!("Notification" in window)) {
      alert(title + "\n" + body); // Fallback for unsupported browsers
      return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: icon || "https://cdn-icons-png.flaticon.com/512/1040/1040230.png"
    });
  } else if (Notification.permission !== "denied") {
      // Try asking one last time
      Notification.requestPermission().then(permission => {
          if (permission === "granted") {
              new Notification(title, { body: body, icon: icon });
          }
      });
  } else {
      console.log("Notifications are blocked by the user.");
  }
}

// ==== Chart.js Setup ====
const ctx = document.getElementById('fillChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(78, 115, 223, 0.5)');
gradient.addColorStop(1, 'rgba(78, 115, 223, 0.0)');

const fillChart = new Chart(ctx, {
  type: 'line',
  data: { 
      labels: [], 
      datasets: [{ 
          label: 'Trash Level (cm)', 
          data: [], 
          borderColor: '#4e73df',
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#4e73df',
          fill: true,
          tension: 0.4 
      }] 
  },
  options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: { 
          y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
          x: { grid: { display: false } }
      } 
  }
});

// ==== ThingSpeak Data Fetching ====
let lastEntryId = null; // Track the last entry to avoid duplicates

function startFetchingData() {
    fetchHistory(); // Load historical data first
    setInterval(fetchThingSpeak, 2000); // Poll every 3s (Fast updates)
}

function fetchHistory() {
    // Fetch last 20 entries to populate chart/logs on load
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=20&timezone=Asia/Kuala_Lumpur`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.feeds) {
                data.feeds.forEach(feed => {
                    updateDashboard(feed, true); // true = isHistory
                });
            }
        })
        .catch(err => console.error("Error fetching history:", err));
}

function fetchThingSpeak() {
    // Fetch the last entry
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_READ_API_KEY}&timezone=Asia/Kuala_Lumpur`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateDashboard(data, false); // false = isLive
        })
        .catch(err => console.error("Error fetching ThingSpeak:", err));
}

function updateDashboard(data, isHistory = false) {
    if (!data) return;

    // Prevent duplicate updates if data hasn't changed
    if (lastEntryId === data.entry_id) return;
    lastEntryId = data.entry_id;

    // Field Mapping from Arduino:
    // Field 1: Hand Distance
    // Field 2: Bin Distance (Fill Level)
    // Field 3: Flame Value
    // Field 4: Lid Status (1=OPEN, 0=CLOSED)
    // Field 5: Bin Status (1=FULL, 0=NOT FULL)

    const handDist = parseFloat(data.field1);
    const binDist  = parseFloat(data.field2);
    const flameVal = parseFloat(data.field3);
    const lidState = parseInt(data.field4); // 1 or 0
    const binState = parseInt(data.field5); // 1 or 0
    const timestamp = new Date(data.created_at);

    // CONSTANT: Total Height of the Bin (from sensor to bottom)
    // Adjust this value to match your actual bin height!
    const BIN_HEIGHT = 100; 

    // Calculate Fill Level (Trash Height)
    // If sensor reads 292cm, and bin is 300cm deep, trash is 8cm high.
    let trashHeight = BIN_HEIGHT - binDist;
    if (trashHeight < 0) trashHeight = 0; // Clamp negative values

    // Calculate Percentage
    let fillPercent = (trashHeight / BIN_HEIGHT) * 100;
    if (fillPercent > 100) fillPercent = 100;

    // 1. Fill Level Display
    const fillEl = document.getElementById('fillLevel');
    fillEl.innerText = fillPercent.toFixed(1) + '%'; // Show Percentage
    
    // Color code based on Percentage
    if(fillPercent > 80) fillEl.className = 'text-danger'; // >80% Full
    else if(fillPercent > 50) fillEl.className = 'text-warning';
    else fillEl.className = 'text-primary';

    // 2. Lid Status
    const isLidOpen = (lidState === 1);
    const lidEl = document.getElementById('lidStatus');
    const lidIcon = document.getElementById('lidIcon');
    
    lidEl.innerText = isLidOpen ? 'OPEN' : 'CLOSED';
    lidEl.className = isLidOpen ? 'text-warning' : 'text-success';
    lidIcon.className = isLidOpen ? 'fas fa-door-open' : 'fas fa-door-closed';
    lidIcon.parentElement.className = isLidOpen ? 'card-icon text-warning' : 'card-icon text-success';

    // 3. Fire Status
    const isFireDanger = (flameVal < 400);
    const fireEl = document.getElementById('fireStatus');
    const fireIcon = document.getElementById('fireIcon');

    fireEl.innerText = isFireDanger ? 'DANGER' : 'SAFE';
    fireEl.className = isFireDanger ? 'text-danger' : 'text-success';
    fireIcon.className = isFireDanger ? 'fas fa-fire' : 'fas fa-fire-extinguisher';
    fireIcon.parentElement.className = isFireDanger ? 'card-icon text-danger' : 'card-icon text-success';

    // --- Notifications ---
    // Only notify for NEW data (not history)
    if (!isHistory) {
        console.log("Checking Alerts -> Fire:", isFireDanger, "Bin:", binState);
        
        if (isFireDanger) {
            sendNotification(
                "🔥 FIRE ALERT!", 
                "Fire detected in the Smart Bin!", 
                "https://cdn-icons-png.flaticon.com/512/426/426833.png" // Fire Icon
            );
        }
        if (binState === 1) { // Bin Full
            sendNotification(
                "🗑️ Bin Full", 
                "The bin is full. Please empty it.", 
                "https://cdn-icons-png.flaticon.com/512/484/484662.png" // Trash Bin Icon
            );
        }
    }

    // --- Update Chart ---
    const timeLabel = timestamp.toLocaleTimeString();
    
    if (fillChart.data.labels.length > 20) {
        fillChart.data.labels.shift();
        fillChart.data.datasets[0].data.shift();
    }

    fillChart.data.labels.push(timeLabel);
    fillChart.data.datasets[0].label = 'Trash Level (cm)'; // Update Label
    fillChart.data.datasets[0].data.push(trashHeight);     // Plot Trash Height
    fillChart.update();

    // --- Update Log Table ---
    const logRow = document.createElement('tr');
    const statusBadge = isFireDanger 
        ? '<span style="background:#e74a3b; color:white; padding:2px 8px; border-radius:4px; font-size:0.8em;">FIRE DETECTED</span>' 
        : '<span style="background:#1cc88a; color:white; padding:2px 8px; border-radius:4px; font-size:0.8em;">Normal</span>';
    
    logRow.innerHTML = `
        <td>${timestamp.toLocaleString()}</td>
        <td>${statusBadge}</td>
        <td>Flame: ${flameVal} | Fill: ${fillPercent.toFixed(0)}%</td>
    `;
    
    const logBody = document.getElementById('fireLog');
    logBody.prepend(logRow);
    
    if (logBody.children.length > 10) {
        logBody.removeChild(logBody.lastChild);
    }
}