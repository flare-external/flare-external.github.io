// ── API BASE DETECTION ──
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'https://dingy-nutshell-disparate.ngrok-free.dev'; // Fallback to live tunnel url for production hosting

// Global State
let token = localStorage.getItem('flare_web_token') || null;
let currentUser = null;

// DOM Elements
const authCardContainer = document.getElementById('authCardContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginPanel = document.getElementById('loginPanel');
const registerPanel = document.getElementById('registerPanel');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const mainNav = document.getElementById('mainNav');
const userWidget = document.getElementById('userWidget');
const headerUsername = document.getElementById('headerUsername');
const headerAvatar = document.getElementById('headerAvatar');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileBadge = document.getElementById('profileBadge');
const profileStatusDetail = document.getElementById('profileStatusDetail');
const profileRegisterDate = document.getElementById('profileRegisterDate');
const profileHwidDetail = document.getElementById('profileHwidDetail');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Tab Panels
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// ── TOAST NOTIFICATION ──
function showToast(message, isError = false) {
  toastMessage.textContent = message;
  toast.className = 'toast show ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ── AUTH PANEL SWITCHING ──
document.getElementById('switchToRegister').addEventListener('click', (e) => {
  e.preventDefault();
  loginPanel.classList.remove('active');
  registerPanel.classList.add('active');
});

document.getElementById('switchToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  registerPanel.classList.remove('active');
  loginPanel.classList.add('active');
});

// ── TAB SWITCHING ──
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');
    
    // Update active tab buttons
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update visible panels
    tabPanels.forEach(panel => {
      if (panel.id === `panel-${targetTab}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    if (targetTab === 'status') {
      updateSystemStatus();
    }
  });
});

// Switch to profile on username or avatar click
[headerUsername, headerAvatar].forEach(el => {
  if (el) {
    el.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanels.forEach(panel => {
        if (panel.id === 'panel-profile') {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  }
});

// CTA Buttons
document.getElementById('heroCtaBtn').addEventListener('click', () => {
  const storeTab = document.querySelector('.nav-tab[data-tab="subscriptions"]');
  if (storeTab) storeTab.click();
});

document.getElementById('heroDownloadBtn').addEventListener('click', () => {
  headerUsername.click();
});

// ── AUTHENTICATION AND API CALLS ──

// Web Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const submitBtn = document.getElementById('registerSubmitBtn');
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match.', true);
    return;
  }

  setLoading(submitBtn, true);
  try {
    const res = await fetch(`${API_BASE}/api/web/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, false);
      registerForm.reset();
      document.getElementById('switchToLogin').click();
    } else {
      showToast(data.message || 'Registration failed.', true);
    }
  } catch (err) {
    showToast('Cannot connect to authentication server.', true);
  } finally {
    setLoading(submitBtn, false);
  }
});

// Web Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const submitBtn = document.getElementById('loginSubmitBtn');

  setLoading(submitBtn, true);
  try {
    const res = await fetch(`${API_BASE}/api/web/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      token = data.token;
      localStorage.setItem('flare_web_token', token);
      showToast('Logged in successfully.', false);
      loginForm.reset();
      initSession();
    } else {
      showToast(data.message || 'Invalid credentials.', true);
    }
  } catch (err) {
    showToast('Cannot connect to authentication server.', true);
  } finally {
    setLoading(submitBtn, false);
  }
});

// Logout Helper
function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('flare_web_token');
  
  // Hide scrollbar on login screen
  document.body.style.overflow = 'hidden';
  
  // Update view
  mainNav.style.display = 'none';
  userWidget.style.display = 'none';
  dashboardContainer.style.display = 'none';
  authCardContainer.style.display = 'block';
  
  // Go back to login tab by default
  document.getElementById('switchToLogin').click();
  showToast('Logged out successfully.', false);
}

headerLogoutBtn.addEventListener('click', logout);

// Initialize Session
async function initSession() {
  if (!token) {
    document.body.style.overflow = 'hidden'; // Hide scrollbar
    authCardContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    mainNav.style.display = 'none';
    userWidget.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/web/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });
    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }
    const data = await res.json();
    if (data.success) {
      document.body.style.overflow = ''; // Restore scrollbar
      currentUser = data;
      setupDashboardUI();
    } else {
      logout();
    }
  } catch (err) {
    console.error('Session init error:', err);
    showToast('Connection to authentication server lost.', true);
  }
}

// Populate Dashboard details
function setupDashboardUI() {
  authCardContainer.style.display = 'none';
  dashboardContainer.style.display = 'flex';
  mainNav.style.display = 'flex';
  userWidget.style.display = 'flex';

  headerUsername.textContent = currentUser.username;
  headerAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
  profileName.textContent = currentUser.username;
  profileAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

  // Parse subscription details
  const hasSub = currentUser.subscription_type;
  const isExpired = hasSub && currentUser.expires_at !== 'lifetime' && new Date(currentUser.expires_at) < new Date();
  const subActive = hasSub && !isExpired;

  // Update header status text (Subscribed or Free)
  const headerUserStatus = document.getElementById('headerUserStatus');
  if (headerUserStatus) {
    headerUserStatus.textContent = subActive ? 'Subscribed' : 'Free';
    headerUserStatus.style.color = subActive ? 'var(--accent-pink)' : 'var(--text-muted)';
  }

  if (subActive) {
    profileBadge.textContent = currentUser.subscription_type;
    profileBadge.className = 'badge active';
    profileStatusDetail.textContent = 'Active';
    profileStatusDetail.style.color = 'var(--accent-green)';
  } else {
    profileBadge.textContent = 'No Subscription';
    profileBadge.className = 'badge';
    profileStatusDetail.textContent = isExpired ? 'Expired' : 'Inactive';
    profileStatusDetail.style.color = 'var(--text-muted)';
  }

  // Set registered date
  if (currentUser.created_at) {
    const date = new Date(currentUser.created_at);
    profileRegisterDate.textContent = date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } else {
    profileRegisterDate.textContent = 'Unknown';
  }

  // Set HWID details
  profileHwidDetail.textContent = currentUser.hwid ? currentUser.hwid : 'Not Bound (Binds on First Run)';
  profileHwidDetail.style.color = currentUser.hwid ? 'var(--text-color)' : 'var(--text-muted)';

  // Build active subscriptions panel
  const activeSubsList = document.getElementById('activeSubsList');
  const subsEmptyState = document.getElementById('subsEmptyState');

  // Clear previous dynamic sub cards
  const existingCards = activeSubsList.querySelectorAll('.sub-card-container, .game-card-web');
  existingCards.forEach(c => c.remove());

  if (subActive) {
    subsEmptyState.style.display = 'none';
    
    // Create Active Subscription Card
    const card = document.createElement('div');
    card.className = 'sub-card-container';
    
    let expiryLabel = '';
    if (currentUser.expires_at === 'lifetime') {
      expiryLabel = 'Lifetime Access';
    } else {
      const expDate = new Date(currentUser.expires_at);
      expiryLabel = 'Expires ' + expDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }

    card.innerHTML = `
      <div class="game-card-web">
        <div class="card-info">
          <div class="card-title-row">
            <span class="card-title">Roblox External</span>
            <span class="card-badge active">${currentUser.subscription_type}</span>
          </div>
          <div class="card-sub" id="subExpiryText">${expiryLabel}</div>
        </div>
        <button class="dl-btn" id="downloadLoaderBtn">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i>
          <span>Download Loader</span>
          <div class="spinner-small" style="display: none;"></div>
        </button>
        <div class="card-icon-box roblox">
          <img src="rblx_icon.png" alt="Roblox" class="card-game-icon">
        </div>
      </div>
    `;

    activeSubsList.appendChild(card);
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Also add CS2 Disabled Card to match Loader exactly
    const cs2Card = document.createElement('div');
    cs2Card.className = 'game-card-web disabled';
    cs2Card.innerHTML = `
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-title">Counter-Strike 2</span>
        </div>
        <div class="card-sub">Coming soon</div>
      </div>
      <div class="card-icon-box cs2">
        <img src="cs2_icon.png" alt="CS2" class="card-game-icon">
      </div>
    `;
    activeSubsList.appendChild(cs2Card);

    // Setup download button listener
    document.getElementById('downloadLoaderBtn').addEventListener('click', handleLoaderDownload);
  } else {
    subsEmptyState.style.display = 'flex';
  }
}

// Handle Loader dynamic build generation and download (Bypasses ngrok browser warnings via Blob download)
async function handleLoaderDownload(e) {
  const btn = e.currentTarget;
  setLoading(btn, true);

  try {
    const res = await fetch(`${API_BASE}/api/web/request-download`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Generating personalized auto-login loader... Download starting.', false);
      
      // Perform Blob fetch with ngrok-skip-browser-warning headers to bypass the warn page
      const downloadRes = await fetch(`${API_BASE}/api/download/loader/${data.downloadToken}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (downloadRes.status === 200) {
        const blob = await downloadRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'loader.exe';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Loader downloaded successfully!', false);
      } else {
        const errText = await downloadRes.text();
        showToast(errText || 'Loader generation failed.', true);
      }
    } else {
      showToast(data.message || 'Failed to request download token.', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to connect to backend for compilation.', true);
  } finally {
    setLoading(btn, false);
  }
}

// Plan Purchasing (Store Tab)
const planButtons = document.querySelectorAll('.plan-btn');
planButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const plan = btn.getAttribute('data-plan');
    setLoading(btn, true);

    try {
      const res = await fetch(`${API_BASE}/api/web/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        if (data.redirect) {
          showToast(data.message || 'Opening secure checkout...', false);
          const trigger = document.getElementById('sellixTriggerBtn');
          if (trigger && typeof Sellix !== 'undefined') {
            // Set attributes dynamically on hidden trigger button & click programmatically
            trigger.setAttribute('data-sellix-product', data.productId);
            trigger.setAttribute('data-sellix-custom-fields', JSON.stringify({
              username: currentUser.username
            }));
            trigger.click();
          } else {
            // Fallback: Open pre-populated custom domain page in new tab
            window.open(data.url, '_blank');
          }
        } else {
          showToast(data.message, false);
          showToast('Sandbox mode: Upgraded successfully! Opening downloads.', false);
          headerUsername.click();
          initSession();
        }
      } else {
        showToast(data.message || 'Subscription failed.', true);
      }
    } catch (err) {
      showToast('Could not connect to subscription server.', true);
    } finally {
      setLoading(btn, false);
    }
  });
});

// Loading indicator helper
function setLoading(button, isLoading) {
  const textSpan = button.querySelector('span');
  const spinner = button.querySelector('.spinner-small');
  
  if (isLoading) {
    button.disabled = true;
    if (textSpan) textSpan.style.opacity = '0.3';
    if (spinner) spinner.style.display = 'block';
  } else {
    button.disabled = false;
    if (textSpan) textSpan.style.opacity = '1';
    if (spinner) spinner.style.display = 'none';
  }
}

// Discord member count dynamic sync
async function updateDiscordMembers() {
  const discordPillText = document.querySelector('.discord-pill span');
  if (!discordPillText) return;
  try {
    const res = await fetch(`${API_BASE}/api/web/discord-members`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const data = await res.json();
    if (data.success && data.members) {
      discordPillText.textContent = `${Number(data.members).toLocaleString()} DISCORD MEMBERS`;
    }
  } catch (err) {
    console.error('Failed to sync Discord member counts:', err);
  }
}

// Dynamic System Status Sync
async function updateSystemStatus() {
  const statusRowsContainer = document.getElementById('statusRowsContainer');
  const statusHubHeader = document.getElementById('statusHubHeader');
  if (!statusRowsContainer || !statusHubHeader) return;

  // Generate 20 mock uptime bars helper
  function generateUptimeBars(stateClass) {
    let barsHtml = '';
    const totalBars = 22;
    for (let i = 0; i < totalBars; i++) {
      const isLatest = i === totalBars - 1;
      let barClass = 'good';
      
      if (stateClass === 'updating') {
        // Last 3 bars show partial warning states
        if (i >= totalBars - 3) {
          barClass = 'warn';
        }
      } else if (stateClass === 'not-working') {
        // Last 2 bars show down states
        if (i >= totalBars - 2) {
          barClass = 'down';
        }
      }

      const latestModifier = isLatest ? ' latest' : '';
      barsHtml += `<span class="status-uptime-bar ${barClass}${latestModifier}"></span>`;
    }
    return barsHtml;
  }

  try {
    const res = await fetch(`${API_BASE}/api/web/status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const data = await res.json();
    if (data.success && data.statuses) {
      statusRowsContainer.innerHTML = '';
      
      // Determine overall system state
      let allWorking = true;
      let allDown = true;
      
      data.statuses.forEach(item => {
        if (item.status !== 'Working') {
          allWorking = false;
        }
        if (item.status === 'Working') {
          allDown = false;
        }
      });

      // Update Overall Hub Status Header
      const pulseEl = statusHubHeader.querySelector('.status-hub-pulse');
      const textEl = statusHubHeader.querySelector('.status-hub-status-text');
      
      pulseEl.className = 'status-hub-pulse';
      textEl.className = 'status-hub-status-text';
      
      if (allWorking) {
        pulseEl.classList.add('all-good');
        textEl.classList.add('all-good');
        textEl.textContent = 'All Systems Operational';
      } else if (allDown) {
        pulseEl.classList.add('all-down');
        textEl.classList.add('all-down');
        textEl.textContent = 'All Systems Offline';
      } else {
        pulseEl.classList.add('partial');
        textEl.classList.add('partial');
        textEl.textContent = 'Partial System Outage';
      }

      // Generate random latency and update header
      const randomLatency = Math.floor(Math.random() * 8) + 12; // 12-19ms
      const latencyMeta = statusHubHeader.querySelector('.status-hub-meta span');
      if (latencyMeta) latencyMeta.textContent = `Average Latency: ${randomLatency}ms`;
      
      const responseValue = document.getElementById('statusResponseTime');
      if (responseValue) responseValue.textContent = `${randomLatency}ms`;

      // Render individual service rows
      data.statuses.forEach(item => {
        const row = document.createElement('div');
        row.className = 'status-row';
        
        let stateClass = 'working';
        let displayStatus = item.status;
        let uptimePct = '99.98%';
        
        if (item.status === 'Updating' || item.status === 'Currently in work') {
          stateClass = 'updating';
          uptimePct = '99.85%';
        } else if (item.status === 'Not working') {
          stateClass = 'not-working';
          uptimePct = '94.20%';
        }

        // Map icons dynamically
        let iconName = item.icon || 'shield';
        if (item.name.includes('Roblox')) iconName = 'gamepad-2';
        else if (item.name.includes('CS2')) iconName = 'shield-alert';
        else if (item.name.includes('Servers')) iconName = 'server';
        else if (item.name.includes('Authentication')) iconName = 'key-round';

        row.innerHTML = `
          <div class="status-row-left">
            <div class="status-row-icon">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="status-row-meta">
              <span class="status-row-name">${item.name}</span>
              <span class="status-row-desc">Uptime monitored 24/7</span>
            </div>
          </div>
          <div class="status-uptime-box">
            <div class="status-uptime-bars">
              ${generateUptimeBars(stateClass)}
            </div>
            <span class="status-uptime-percent">${uptimePct}</span>
          </div>
          <div class="status-row-badge-box">
            <div class="status-badge ${stateClass}">
              <div class="status-dot"></div>
              <span>${displayStatus}</span>
            </div>
          </div>
        `;
        statusRowsContainer.appendChild(row);
      });

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  } catch (err) {
    console.error('Failed to sync system statuses:', err);
    
    // Set Header to All Down
    const pulseEl = statusHubHeader.querySelector('.status-hub-pulse');
    const textEl = statusHubHeader.querySelector('.status-hub-status-text');
    if (pulseEl && textEl) {
      pulseEl.className = 'status-hub-pulse all-down';
      textEl.className = 'status-hub-status-text all-down';
      textEl.textContent = 'All Services Offline';
    }

    const responseValue = document.getElementById('statusResponseTime');
    if (responseValue) responseValue.textContent = 'Offline';

    // Render Offline Mock Service Rows
    const offlineServices = [
      { name: 'Roblox External', icon: 'gamepad-2' },
      { name: 'CS2 External', icon: 'shield-alert' },
      { name: 'Flare Servers', icon: 'server' },
      { name: 'Authentication Service', icon: 'key-round' }
    ];

    statusRowsContainer.innerHTML = '';
    offlineServices.forEach(item => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `
        <div class="status-row-left">
          <div class="status-row-icon">
            <i data-lucide="${item.icon}"></i>
          </div>
          <div class="status-row-meta">
            <span class="status-row-name">${item.name}</span>
            <span class="status-row-desc">Connection failed</span>
          </div>
        </div>
        <div class="status-uptime-box">
          <div class="status-uptime-bars">
            ${generateUptimeBars('not-working')}
          </div>
          <span class="status-uptime-percent">0.00%</span>
        </div>
        <div class="status-row-badge-box">
          <div class="status-badge not-working">
            <div class="status-dot"></div>
            <span>Offline</span>
          </div>
        </div>
      `;
      statusRowsContainer.appendChild(row);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

// Start Session check on load
document.addEventListener('DOMContentLoaded', () => {
  initSession();
  updateDiscordMembers();
  updateSystemStatus();
  setInterval(updateDiscordMembers, 60000); // Update count every 60 seconds
  setInterval(updateSystemStatus, 30000);   // Update tool status every 30 seconds
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
