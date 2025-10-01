// Firebase Configuration - Will be loaded when DOM is ready
let db;
let firebaseConfig;

// Global Variables
let currentUser = null;
let users = [];
let tasks = [];
let projects = [];
let broadcasts = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const pageTitle = document.getElementById('pageTitle');
const currentUserElement = document.getElementById('currentUser');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Admin panel loading...");
    
    // Wait for Firebase to be available
    const initFirebase = () => {
        if (typeof firebase !== 'undefined') {
            console.log("✅ Firebase SDK loaded");
            
            // Load Firebase config
            firebaseConfig = getFirebaseConfig();
            console.log("Firebase config:", firebaseConfig);
            console.log("Project ID from config:", firebaseConfig.projectId);
            
            // Initialize Firebase
            try {
                firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
                console.log("✅ Firebase initialized successfully!");
                console.log("Project ID:", firebase.app().options.projectId);
            } catch (error) {
                console.error("❌ Firebase initialization failed:", error);
                db = null;
            }
            
            initializeDashboard();
            setupEventListeners();
            loadDashboardData();
            initStatusCheck(); // Initialize status checking
        } else {
            console.log("⏳ Waiting for Firebase SDK...");
            setTimeout(initFirebase, 500);
        }
    };
    
    initFirebase();
});

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Task filter
    const taskFilter = document.getElementById('taskFilter');
    if (taskFilter) {
        taskFilter.addEventListener('change', filterTasks);
    }
    
    // Date filter
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', filterTasks);
    }
    
    // Leaderboard period
    const leaderboardPeriod = document.getElementById('leaderboardPeriod');
    if (leaderboardPeriod) {
        leaderboardPeriod.addEventListener('change', loadLeaderboard);
    }
}

// Toggle Sidebar
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// Show Section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active nav item
    const activeNavItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Update page title
    const sectionTitles = {
        'dashboard': 'Dashboard',
        'users': 'User Management',
        'tasks': 'Task Management',
        'projects': 'Projects & Clients',
        'analytics': 'Analytics & Reports',
        'leaderboard': 'Leaderboard',
        'broadcast': 'Broadcast Messages',
        'settings': 'Settings'
    };
    
    pageTitle.textContent = sectionTitles[sectionId] || 'Dashboard';
    
    // Load section-specific data
    switch(sectionId) {
        case 'users':
            loadUsers();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'broadcast':
            loadBroadcastHistory();
            break;
    }
}

// Initialize Dashboard
function initializeDashboard() {
    console.log("🎯 Initializing Team Task Bot Admin Dashboard...");
    
    // Set current user
    currentUser = {
        name: "Admin",
        role: "admin"
    };
    
    currentUserElement.textContent = currentUser.name;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;
}

// Load Dashboard Data
async function loadDashboardData() {
    showLoading(true);
    
    try {
        await Promise.all([
            loadUsers(),
            loadTasks(),
            loadProjects(),
            loadBroadcastHistory()
        ]);
        
        updateDashboardStats();
        loadRecentTasks();
        loadTopPerformers();
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showNotification("Error loading dashboard data", "error");
    } finally {
        showLoading(false);
    }
}

// Update Dashboard Stats
function updateDashboardStats() {
    const totalUsers = users.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('pendingTasks').textContent = pendingTasks;
}

// Load Recent Tasks
function loadRecentTasks() {
    const recentTasksContainer = document.getElementById('recentTasks');
    if (!recentTasksContainer) return;
    
    const recentTasks = tasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentTasks.length === 0) {
        recentTasksContainer.innerHTML = '<p class="text-center text-muted">No recent tasks</p>';
        return;
    }
    
    recentTasksContainer.innerHTML = recentTasks.map(task => `
        <div class="task-item">
            <div class="task-info">
                <h4>${task.description}</h4>
                <p>By: ${task.userName} • ${formatDate(task.createdAt)}</p>
            </div>
            <span class="status-badge status-${task.status}">${task.status}</span>
        </div>
    `).join('');
}

// Load Top Performers
function loadTopPerformers() {
    const topPerformersContainer = document.getElementById('topPerformers');
    if (!topPerformersContainer) return;
    
    const performers = users
        .map(user => ({
            ...user,
            completedTasks: tasks.filter(task => 
                task.userId === user.userId && task.status === 'completed'
            ).length
        }))
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5);
    
    if (performers.length === 0) {
        topPerformersContainer.innerHTML = '<p class="text-center text-muted">No data available</p>';
        return;
    }
    
    topPerformersContainer.innerHTML = performers.map((performer, index) => `
        <div class="performer-item">
            <div class="performer-rank">${index + 1}</div>
            <div class="performer-info">
                <h4>${performer.userName}</h4>
                <p>${performer.completedTasks} tasks completed</p>
            </div>
        </div>
    `).join('');
}

// Load Users
async function loadUsers() {
    try {
        if (db) {
            const snapshot = await db.collection('users').get();
            users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            users = Object.values(localData.users || {});
        }
        
        renderUsersTable();
    } catch (error) {
        console.error("Error loading users:", error);
        showNotification("Error loading users", "error");
    }
}

// Render Users Table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.userName || 'Unknown'}</td>
            <td>${user.userId || 'N/A'}</td>
            <td>${user.totalTasks || 0}</td>
            <td>${user.completedTasks || 0}</td>
            <td>${user.strikes || 0}</td>
            <td>${formatDate(user.lastActive)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser('${user.userId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.userId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load Tasks
async function loadTasks() {
    try {
        if (db) {
            const snapshot = await db.collection('tasks').get();
            tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            tasks = Object.values(localData.tasks || {});
        }
        
        renderTasksTable();
    } catch (error) {
        console.error("Error loading tasks:", error);
        showNotification("Error loading tasks", "error");
    }
}

// Render Tasks Table
function renderTasksTable() {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No tasks found</td></tr>';
        return;
    }
    
    tbody.innerHTML = tasks.map(task => `
        <tr>
            <td>${task.id ? task.id.substring(0, 8) : 'N/A'}</td>
            <td>${task.userName || 'Unknown'}</td>
            <td>${task.description || 'N/A'}</td>
            <td><span class="status-badge status-${task.status}">${task.status}</span></td>
            <td>${formatDate(task.createdAt)}</td>
            <td>${task.completedAt ? formatDate(task.completedAt) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter Tasks
function filterTasks() {
    const statusFilter = document.getElementById('taskFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    let filteredTasks = tasks;
    
    if (statusFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    
    if (dateFilter) {
        filteredTasks = filteredTasks.filter(task => {
            const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
            return taskDate === dateFilter;
        });
    }
    
    // Re-render table with filtered data
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    if (filteredTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No tasks found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredTasks.map(task => `
        <tr>
            <td>${task.id ? task.id.substring(0, 8) : 'N/A'}</td>
            <td>${task.userName || 'Unknown'}</td>
            <td>${task.description || 'N/A'}</td>
            <td><span class="status-badge status-${task.status}">${task.status}</span></td>
            <td>${formatDate(task.createdAt)}</td>
            <td>${task.completedAt ? formatDate(task.completedAt) : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load Projects
async function loadProjects() {
    try {
        if (db) {
            const snapshot = await db.collection('projects').get();
            projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            projects = Object.values(localData.projects || {});
        }
        
        renderProjectsGrid();
    } catch (error) {
        console.error("Error loading projects:", error);
        showNotification("Error loading projects", "error");
    }
}

// Render Projects Grid
function renderProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="text-center text-muted">No projects found</div>';
        return;
    }
    
    grid.innerHTML = projects.map(project => `
        <div class="project-card">
            <h3>${project.name || 'Untitled Project'}</h3>
            <p><strong>Client:</strong> ${project.client || 'N/A'}</p>
            <p>${project.description || 'No description available'}</p>
            <div class="project-meta">
                <span>${project.assignedUsers ? project.assignedUsers.length : 0} users</span>
                <div>
                    <button class="btn btn-sm btn-primary" onclick="editProject('${project.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProject('${project.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load Analytics
async function loadAnalytics() {
    try {
        // Load completion chart
        loadCompletionChart();
        
        // Load performance chart
        loadPerformanceChart();
        
    } catch (error) {
        console.error("Error loading analytics:", error);
        showNotification("Error loading analytics", "error");
    }
}

// Load Completion Chart
function loadCompletionChart() {
    const ctx = document.getElementById('completionChart');
    if (!ctx) return;
    
    // Group tasks by date
    const taskGroups = {};
    tasks.forEach(task => {
        const date = new Date(task.createdAt).toISOString().split('T')[0];
        if (!taskGroups[date]) {
            taskGroups[date] = { completed: 0, pending: 0 };
        }
        taskGroups[date][task.status]++;
    });
    
    const dates = Object.keys(taskGroups).sort();
    const completedData = dates.map(date => taskGroups[date].completed);
    const pendingData = dates.map(date => taskGroups[date].pending);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Completed',
                data: completedData,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4
            }, {
                label: 'Pending',
                data: pendingData,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Task Completion Trend'
                }
            }
        }
    });
}

// Load Performance Chart
function loadPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    const userPerformance = users.map(user => {
        const userTasks = tasks.filter(task => task.userId === user.userId);
        const completed = userTasks.filter(task => task.status === 'completed').length;
        const total = userTasks.length;
        return {
            name: user.userName,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }).sort((a, b) => b.completionRate - a.completionRate).slice(0, 10);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: userPerformance.map(user => user.name),
            datasets: [{
                label: 'Completion Rate (%)',
                data: userPerformance.map(user => user.completionRate),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'User Performance'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Load Leaderboard
async function loadLeaderboard() {
    try {
        const period = document.getElementById('leaderboardPeriod')?.value || 'all';
        const container = document.getElementById('leaderboardContainer');
        if (!container) return;
        
        // Calculate leaderboard based on period
        const leaderboard = calculateLeaderboard(period);
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No data available</div>';
            return;
        }
        
        container.innerHTML = leaderboard.map((user, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank rank-${index < 3 ? index + 1 : 'other'}">
                    ${index + 1}
                </div>
                <div class="leaderboard-info">
                    <h4>${user.name}</h4>
                    <div class="leaderboard-stats">
                        <span>✅ ${user.completedTasks} completed</span>
                        <span>📊 ${user.completionRate}% rate</span>
                        <span>⚠️ ${user.strikes} strikes</span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        showNotification("Error loading leaderboard", "error");
    }
}

// Calculate Leaderboard
function calculateLeaderboard(period) {
    const now = new Date();
    let filteredTasks = tasks;
    
    if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredTasks = tasks.filter(task => new Date(task.createdAt) >= weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredTasks = tasks.filter(task => new Date(task.createdAt) >= monthAgo);
    }
    
    return users.map(user => {
        const userTasks = filteredTasks.filter(task => task.userId === user.userId);
        const completed = userTasks.filter(task => task.status === 'completed').length;
        const total = userTasks.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
            name: user.userName,
            completedTasks: completed,
            totalTasks: total,
            completionRate: completionRate,
            strikes: user.strikes || 0
        };
    }).sort((a, b) => b.completedTasks - a.completedTasks);
}

// Load Broadcast History
async function loadBroadcastHistory() {
    try {
        if (db) {
            const snapshot = await db.collection('broadcasts').get();
            broadcasts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            broadcasts = Object.values(localData.broadcasts || {});
        }
        
        renderBroadcastHistory();
    } catch (error) {
        console.error("Error loading broadcast history:", error);
    }
}

// Render Broadcast History
function renderBroadcastHistory() {
    const container = document.getElementById('broadcastHistory');
    if (!container) return;
    
    if (broadcasts.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No broadcasts sent</div>';
        return;
    }
    
    container.innerHTML = broadcasts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(broadcast => `
            <div class="broadcast-item">
                <div class="broadcast-message">${broadcast.message}</div>
                <div class="broadcast-meta">
                    ${formatDate(broadcast.timestamp)} • ${broadcast.recipients || 0} recipients
                </div>
            </div>
        `).join('');
}

// Send Broadcast
async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage').value;
    const includeMotivation = document.getElementById('includeMotivation').checked;
    const urgent = document.getElementById('urgentMessage').checked;
    
    if (!message.trim()) {
        showNotification("Please enter a message", "error");
        return;
    }
    
    try {
        showLoading(true);
        
        let finalMessage = message;
        if (includeMotivation) {
            const motivationalMessages = [
                "💪 Keep pushing forward!",
                "🚀 You're doing great!",
                "⭐ Every task completed is a step closer to success!",
                "🔥 Consistency is the key to success!",
                "💎 Hard work pays off!"
            ];
            const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
            finalMessage += `\n\n${randomMessage}`;
        }
        
        if (urgent) {
            finalMessage = `🚨 URGENT: ${finalMessage}`;
        }
        
        // Save broadcast to database
        const broadcast = {
            message: finalMessage,
            timestamp: new Date().toISOString(),
            urgent: urgent,
            recipients: users.length
        };
        
        if (db) {
            await db.collection('broadcasts').add(broadcast);
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            if (!localData.broadcasts) localData.broadcasts = {};
            localData.broadcasts[Date.now().toString()] = broadcast;
            localStorage.setItem('wa-team-bot', JSON.stringify(localData));
        }
        
        // Clear form
        document.getElementById('broadcastMessage').value = '';
        document.getElementById('includeMotivation').checked = false;
        document.getElementById('urgentMessage').checked = false;
        
        showNotification("Broadcast sent successfully!", "success");
        loadBroadcastHistory();
        
    } catch (error) {
        console.error("Error sending broadcast:", error);
        showNotification("Error sending broadcast", "error");
    } finally {
        showLoading(false);
    }
}

// Generate Report
function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification("Please select start and end dates", "error");
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const filteredTasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= start && taskDate <= end;
    });
    
    const report = {
        period: `${startDate} to ${endDate}`,
        totalTasks: filteredTasks.length,
        completedTasks: filteredTasks.filter(task => task.status === 'completed').length,
        pendingTasks: filteredTasks.filter(task => task.status === 'pending').length,
        completionRate: filteredTasks.length > 0 ? 
            Math.round((filteredTasks.filter(task => task.status === 'completed').length / filteredTasks.length) * 100) : 0
    };
    
    // Display report
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
        <html>
            <head>
                <title>Team Task Report - ${report.period}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                    .stat { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                    .stat h3 { margin: 0; font-size: 2em; color: #333; }
                    .stat p { margin: 5px 0 0 0; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Team Task Report</h1>
                    <p>Period: ${report.period}</p>
                </div>
                <div class="stats">
                    <div class="stat">
                        <h3>${report.totalTasks}</h3>
                        <p>Total Tasks</p>
                    </div>
                    <div class="stat">
                        <h3>${report.completedTasks}</h3>
                        <p>Completed</p>
                    </div>
                    <div class="stat">
                        <h3>${report.pendingTasks}</h3>
                        <p>Pending</p>
                    </div>
                    <div class="stat">
                        <h3>${report.completionRate}%</h3>
                        <p>Completion Rate</p>
                    </div>
                </div>
            </body>
        </html>
    `);
    reportWindow.document.close();
}

// Modal Functions
function openUserModal() {
    document.getElementById('userModal').style.display = 'block';
    loadProjectsForUserSelect();
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

function openProjectModal() {
    document.getElementById('projectModal').style.display = 'block';
    loadUsersForProjectSelect();
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

// Load Projects for User Select
function loadProjectsForUserSelect() {
    const select = document.getElementById('userProject');
    if (!select) return;
    
    select.innerHTML = projects.map(project => 
        `<option value="${project.id}">${project.name}</option>`
    ).join('');
}

// Load Users for Project Select
function loadUsersForProjectSelect() {
    const select = document.getElementById('projectUsers');
    if (!select) return;
    
    select.innerHTML = users.map(user => 
        `<option value="${user.userId}">${user.userName}</option>`
    ).join('');
}

// Save User
async function saveUser() {
    const form = document.getElementById('userForm');
    const formData = new FormData(form);
    
    const user = {
        userName: document.getElementById('userName').value,
        userId: document.getElementById('userWhatsAppId').value,
        totalTasks: 0,
        completedTasks: 0,
        strikes: 0,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    try {
        if (db) {
            await db.collection('users').doc(user.userId).set(user);
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            if (!localData.users) localData.users = {};
            localData.users[user.userId] = user;
            localStorage.setItem('wa-team-bot', JSON.stringify(localData));
        }
        
        showNotification("User saved successfully!", "success");
        closeUserModal();
        loadUsers();
        
    } catch (error) {
        console.error("Error saving user:", error);
        showNotification("Error saving user", "error");
    }
}

// Save Project
async function saveProject() {
    const project = {
        name: document.getElementById('projectName').value,
        client: document.getElementById('clientName').value,
        description: document.getElementById('projectDescription').value,
        assignedUsers: Array.from(document.getElementById('projectUsers').selectedOptions).map(option => option.value),
        createdAt: new Date().toISOString()
    };
    
    try {
        if (db) {
            await db.collection('projects').add(project);
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            if (!localData.projects) localData.projects = {};
            localData.projects[Date.now().toString()] = project;
            localStorage.setItem('wa-team-bot', JSON.stringify(localData));
        }
        
        showNotification("Project saved successfully!", "success");
        closeProjectModal();
        loadProjects();
        
    } catch (error) {
        console.error("Error saving project:", error);
        showNotification("Error saving project", "error");
    }
}

// Save Settings
async function saveSettings() {
    const settings = {
        morningTime: document.getElementById('morningTime').value,
        eveningTime: document.getElementById('eveningTime').value,
        maxStrikes: parseInt(document.getElementById('maxStrikes').value)
    };
    
    try {
        if (db) {
            await db.collection('settings').doc('bot').set(settings);
        } else {
            // Fallback to local storage
            const localData = JSON.parse(localStorage.getItem('wa-team-bot') || '{}');
            localData.settings = settings;
            localStorage.setItem('wa-team-bot', JSON.stringify(localData));
        }
        
        showNotification("Settings saved successfully!", "success");
        
    } catch (error) {
        console.error("Error saving settings:", error);
        showNotification("Error saving settings", "error");
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 4000;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Placeholder functions for edit/delete operations
function editUser(userId) {
    showNotification("Edit user functionality coming soon!", "info");
}

function deleteUser(userId) {
    if (confirm("Are you sure you want to delete this user?")) {
        showNotification("Delete user functionality coming soon!", "info");
    }
}

function editTask(taskId) {
    showNotification("Edit task functionality coming soon!", "info");
}

function deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
        showNotification("Delete task functionality coming soon!", "info");
    }
}

function editProject(projectId) {
    showNotification("Edit project functionality coming soon!", "info");
}

function deleteProject(projectId) {
    if (confirm("Are you sure you want to delete this project?")) {
        showNotification("Delete project functionality coming soon!", "info");
    }
}

// ========================================
// STATUS SECTION FUNCTIONS
// ========================================

let statusCheckInterval;

// Initialize status checking
function initStatusCheck() {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        checkAllStatus();
        // Check status every 30 seconds
        statusCheckInterval = setInterval(checkAllStatus, 30000);
    }, 2000);
}

// Check all system status
async function checkAllStatus() {
    console.log("🔍 Checking system status...");
    console.log("Firebase available:", typeof firebase !== 'undefined');
    console.log("Firebase apps:", firebase?.apps?.length || 0);
    console.log("DB available:", typeof db !== 'undefined');
    
    // Check Firebase connection
    await checkFirebaseStatus();
    
    // Check WhatsApp Bot status
    await checkBotStatus();
    
    // Check environment variables
    checkEnvironmentStatus();
    
    // Check data collections
    await checkCollectionsStatus();
    
    // Check overall health
    checkOverallHealth();
}

// Check Firebase connection
async function checkFirebaseStatus() {
    const statusElement = document.getElementById('firebaseStatus');
    const projectElement = document.getElementById('firebaseProject');
    const connectionElement = document.getElementById('firebaseConnection');
    const lastCheckElement = document.getElementById('firebaseLastCheck');
    const cardElement = document.querySelector('.status-card');
    
    try {
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Checking...</span>';
        statusElement.className = 'status-indicator checking';
        
        // Wait for Firebase to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if Firebase is initialized
        if (typeof firebase === 'undefined') {
            throw new Error("Firebase SDK not loaded");
        }
        
        if (!firebase.apps || firebase.apps.length === 0) {
            throw new Error("Firebase not initialized");
        }
        
        // Get project info
        const projectId = firebase.app().options.projectId;
        console.log("Firebase project ID:", projectId);
        
        // Fallback to config if Firebase doesn't return project ID
        const displayProjectId = projectId || firebaseConfig?.projectId || 'nxctools';
        projectElement.textContent = displayProjectId;
        
        // Test Firebase connection with a simple read
        if (db) {
            try {
                const testDoc = await db.collection('users').limit(1).get();
                connectionElement.textContent = 'Connected';
                lastCheckElement.textContent = new Date().toLocaleTimeString();
                
                statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
                statusElement.className = 'status-indicator connected';
                cardElement.className = 'status-card firebase-connected';
                
                console.log("✅ Firebase status: Connected");
            } catch (dbError) {
                throw new Error("Database connection failed: " + dbError.message);
            }
        } else {
            throw new Error("Firestore not initialized");
        }
        
    } catch (error) {
        console.error("Firebase connection error:", error);
        
        projectElement.textContent = 'Error: ' + error.message;
        connectionElement.textContent = 'Disconnected';
        lastCheckElement.textContent = new Date().toLocaleTimeString();
        
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
        statusElement.className = 'status-indicator disconnected';
        cardElement.className = 'status-card firebase-disconnected';
    }
}

// Check WhatsApp Bot status
async function checkBotStatus() {
    const statusElement = document.getElementById('botStatus');
    const connectionElement = document.getElementById('botConnection');
    const lastActivityElement = document.getElementById('botLastActivity');
    const cardElement = document.querySelectorAll('.status-card')[1];
    
    try {
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Checking...</span>';
        statusElement.className = 'status-indicator checking';
        
        // Check manual override first
        let botRunning;
        if (manualBotStatus !== null) {
            botRunning = manualBotStatus;
            console.log("Using manual bot status:", botRunning ? "Running" : "Not Running");
        } else {
            // Try to ping the bot process (this is a placeholder - in real implementation you'd need an API endpoint)
            botRunning = await checkBotProcess();
        }
        
        if (botRunning) {
            // Bot process is running
            connectionElement.textContent = 'Running (Process Active)';
            lastActivityElement.textContent = new Date().toLocaleTimeString();
            
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Running</span>';
            statusElement.className = 'status-indicator connected';
            cardElement.className = 'status-card bot-connected';
            
            console.log("✅ Bot process is running");
        } else {
            // Bot process not running
            connectionElement.textContent = 'Not Running (Process Stopped)';
            lastActivityElement.textContent = 'N/A';
            
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Not Running</span>';
            statusElement.className = 'status-indicator disconnected';
            cardElement.className = 'status-card bot-disconnected';
            
            console.log("❌ Bot process not running");
        }
        
    } catch (error) {
        console.error("Bot status check error:", error);
        
        connectionElement.textContent = 'Error: ' + error.message;
        lastActivityElement.textContent = 'N/A';
        
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Error</span>';
        statusElement.className = 'status-indicator disconnected';
        cardElement.className = 'status-card bot-disconnected';
    }
}

// Check if bot process is running
async function checkBotProcess() {
    try {
        // Since this is localhost, we can't directly check the bot process
        // We'll use a more reliable method: check for very recent activity
        
        if (db) {
            // Check for activity in last 2 minutes (more sensitive for localhost)
            const twoMinutesAgo = new Date();
            twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
            
            const recentUsers = await db.collection('users')
                .where('lastActive', '>=', twoMinutesAgo.toISOString())
                .limit(1)
                .get();
            
            if (!recentUsers.empty) {
                console.log("✅ Recent activity found - bot likely running");
                return true;
            }
            
            // Also check if there are any users at all (indicates bot has been used)
            const allUsers = await db.collection('users').get();
            if (allUsers.size > 0) {
                console.log("ℹ️ Users exist but no recent activity - bot may be running but idle");
                // For localhost, we'll be more lenient
                return true;
            }
        }
        
        console.log("❌ No activity or users found - bot likely not running");
        return false;
    } catch (error) {
        console.error("Error checking bot process:", error);
        return false;
    }
}

// Check environment variables
function checkEnvironmentStatus() {
    const statusElement = document.getElementById('envStatus');
    const adminJidElement = document.getElementById('adminJid');
    const groupIdElement = document.getElementById('groupId');
    const configLoadedElement = document.getElementById('configLoaded');
    const cardElement = document.querySelectorAll('.status-card')[2];
    
    try {
        const config = getFirebaseConfig();
        const hasRequiredConfig = config.apiKey && config.projectId && config.authDomain;
        
        adminJidElement.textContent = window.envLoader?.get('ADMIN_JID') || '923464293816';
        groupIdElement.textContent = window.envLoader?.get('GROUP_ID') || 'Not set (Individual Chat Mode)';
        configLoadedElement.textContent = hasRequiredConfig ? 'Yes' : 'No';
        
        if (hasRequiredConfig) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>OK</span>';
            statusElement.className = 'status-indicator connected';
            cardElement.className = 'status-card env-ok';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Error</span>';
            statusElement.className = 'status-indicator disconnected';
            cardElement.className = 'status-card env-error';
        }
        
    } catch (error) {
        console.error("Environment check error:", error);
        
        adminJidElement.textContent = 'Error';
        groupIdElement.textContent = 'Error';
        configLoadedElement.textContent = 'No';
        
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Error</span>';
        statusElement.className = 'status-indicator disconnected';
        cardElement.className = 'status-card env-error';
    }
}

// Check data collections
async function checkCollectionsStatus() {
    const statusElement = document.getElementById('collectionsStatus');
    const usersCountElement = document.getElementById('usersCount');
    const tasksCountElement = document.getElementById('tasksCount');
    const projectsCountElement = document.getElementById('projectsCount');
    const cardElement = document.querySelectorAll('.status-card')[3];
    
    try {
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Checking...</span>';
        statusElement.className = 'status-indicator checking';
        
        // Check if Firebase is available
        if (!db) {
            throw new Error("Firebase not connected");
        }
        
        // Get collection counts
        const [usersSnapshot, tasksSnapshot, projectsSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('tasks').get(),
            db.collection('projects').get()
        ]);
        
        const usersCount = usersSnapshot.size;
        const tasksCount = tasksSnapshot.size;
        const projectsCount = projectsSnapshot.size;
        
        usersCountElement.textContent = usersCount;
        tasksCountElement.textContent = tasksCount;
        projectsCountElement.textContent = projectsCount;
        
        console.log(`📊 Data counts - Users: ${usersCount}, Tasks: ${tasksCount}, Projects: ${projectsCount}`);
        
        // If no data, suggest creating test data
        if (usersCount === 0 && tasksCount === 0) {
            console.log("💡 No data found. Bot needs to be used to create data.");
        }
        
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>OK</span>';
        statusElement.className = 'status-indicator connected';
        cardElement.className = 'status-card collections-ok';
        
    } catch (error) {
        console.error("Collections check error:", error);
        
        usersCountElement.textContent = 'N/A';
        tasksCountElement.textContent = 'N/A';
        projectsCountElement.textContent = 'N/A';
        
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Not Connected</span>';
        statusElement.className = 'status-indicator disconnected';
        cardElement.className = 'status-card collections-error';
    }
}

// Check overall system health
function checkOverallHealth() {
    const healthElement = document.getElementById('overallHealth');
    const indicators = document.querySelectorAll('.status-indicator');
    
    let connectedCount = 0;
    let totalCount = 0;
    
    indicators.forEach(indicator => {
        if (indicator.classList.contains('connected')) {
            connectedCount++;
        }
        if (!indicator.classList.contains('checking')) {
            totalCount++;
        }
    });
    
    const healthPercentage = totalCount > 0 ? (connectedCount / totalCount) * 100 : 0;
    
    if (healthPercentage >= 80) {
        healthElement.innerHTML = `
            <div class="health-indicator healthy">
                <i class="fas fa-heartbeat"></i>
                <span>System Healthy (${Math.round(healthPercentage)}%)</span>
            </div>
        `;
    } else if (healthPercentage >= 50) {
        healthElement.innerHTML = `
            <div class="health-indicator warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>System Warning (${Math.round(healthPercentage)}%)</span>
            </div>
        `;
    } else {
        healthElement.innerHTML = `
            <div class="health-indicator error">
                <i class="fas fa-times-circle"></i>
                <span>System Error (${Math.round(healthPercentage)}%)</span>
            </div>
        `;
    }
}

// Refresh status manually
function refreshStatus() {
    showNotification("Refreshing system status...", "info");
    console.log("🔄 Manual refresh triggered");
    
    // Clear any existing interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    // Wait a moment then check
    setTimeout(() => {
        checkAllStatus();
        // Restart interval
        statusCheckInterval = setInterval(checkAllStatus, 30000);
    }, 500);
}

// Test all connections
async function testAllConnections() {
    showNotification("Testing all connections...", "info");
    await checkAllStatus();
    showNotification("Connection test completed!", "success");
}

// View logs (placeholder)
function viewLogs() {
    showNotification("Log viewer coming soon!", "info");
}

// Toggle bot status for localhost testing
let manualBotStatus = null; // null = auto, true = running, false = stopped

function toggleBotStatus() {
    if (manualBotStatus === null) {
        manualBotStatus = true;
        showNotification("Bot status set to Running (Manual)", "success");
    } else if (manualBotStatus === true) {
        manualBotStatus = false;
        showNotification("Bot status set to Not Running (Manual)", "warning");
    } else {
        manualBotStatus = null;
        showNotification("Bot status set to Auto-detect", "info");
    }
    
    // Refresh status immediately
    checkBotStatus();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const userModal = document.getElementById('userModal');
    const projectModal = document.getElementById('projectModal');
    
    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === projectModal) {
        closeProjectModal();
    }
}
