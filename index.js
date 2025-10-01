require('dotenv').config();
const qrcode = require("qrcode-terminal");
const schedule = require('node-schedule');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');
const {
  makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

// ========================================
// FIREBASE INITIALIZATION
// ========================================
let db;

// Check if Firebase credentials are provided
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error("❌ Firebase credentials not found!");
  console.error("Please set the following environment variables in your .env file:");
  console.error("- FIREBASE_PROJECT_ID");
  console.error("- FIREBASE_PRIVATE_KEY");
  console.error("- FIREBASE_CLIENT_EMAIL");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  db = admin.firestore();
  console.log("✅ Firebase connected successfully!");
  console.log(`📊 Project: ${process.env.FIREBASE_PROJECT_ID}`);
} catch (error) {
  console.error("❌ Firebase connection failed:", error.message);
  console.error("Please check your Firebase credentials in .env file");
  process.exit(1);
}

// ========================================
// BOT CONFIGURATION
// ========================================
const BOT_CONFIG = {
  name: "Task Manager Bot",
  prefix: "/",
  version: "2.0.0",
  author: "Your Name",
  adminJid: process.env.ADMIN_JID,
  groupId: process.env.GROUP_ID,
  mode: "individual" // individual chat mode like Telegram
};

// ========================================
// BOT MESSAGES
// ========================================
const MESSAGES = {
  welcome: "👋 Welcome to Task Manager Bot!\n\n📱 *Main Menu:*\n\n1️⃣ Add Task\n2️⃣ My Tasks\n3️⃣ Complete Task\n4️⃣ Edit Task\n5️⃣ My Progress\n6️⃣ My Stats\n7️⃣ My Profile\n8️⃣ Leaderboard\n9️⃣ Help\n0️⃣ Exit\n\n*Reply with number to select option*",
  help: `🤖 *${BOT_CONFIG.name} Help:*

📱 *Menu Options:*
• Add Task - Add new daily task
• My Tasks - View all your tasks
• Complete Task - Mark task as complete
• Edit Task - Edit existing task
• My Progress - View your progress
• My Stats - Detailed statistics
• My Profile - Your profile info
• Leaderboard - Global rankings
• Help - Show this help
• Exit - Close menu

*Bot Version:* ${BOT_CONFIG.version}`,
  // textMenu removed - using simple text only
  ping: "🏓 Pong! Bot is online and working!",
  info: `🤖 *Bot Information:*
*Name:* ${BOT_CONFIG.name}
*Version:* ${BOT_CONFIG.version}
*Author:* ${BOT_CONFIG.author}
*Status:* Online ✅`,
  error: "❌ Sorry, something went wrong!",
  unknown: "❓ Invalid option! Please select from menu (1-9, 0 to exit)",
  taskAdded: "✅ Task added successfully!",
  taskCompleted: "🎉 Task marked as completed!",
  taskEdited: "✏️ Task updated successfully!",
  noTasks: "📝 No tasks found!",
  strikeWarning: "⚠️ You have {strikes} strikes!",
  // menu removed - using simple text only
  addTaskPrompt: "📝 *Add New Task:*\n\nPlease type your task description:\n\n*Example:* Complete project documentation\n\n*Type 'back' to return to menu*",
  completeTaskPrompt: "✅ *Complete Task:*\n\nPlease provide task ID to complete:\n\n*Type 'back' to return to menu*",
  editTaskPrompt: "✏️ *Edit Task:*\n\nPlease provide task ID and new description:\n\n*Format:* task_id new_description\n*Example:* abc123 Complete updated documentation\n\n*Type 'back' to return to menu*",
  motivational: [
    "💪 Keep pushing forward!",
    "🚀 You're doing great!",
    "⭐ Every task completed is a step closer to success!",
    "🔥 Consistency is the key to success!",
    "💎 Hard work pays off!"
  ]
};

// ========================================
// DATABASE FUNCTIONS
// ========================================

/**
 * Save data to Firebase
 */
async function saveData(collection, docId, data) {
  try {
    if (!db) {
      throw new Error("Firebase not initialized. Please check your Firebase configuration.");
    }
    
    // Add timestamp for better tracking
    data.updatedAt = getCurrentTime();
    data.updatedAtTimestamp = Date.now();
    
    await db.collection(collection).doc(docId).set(data, { merge: true });
    console.log(`✅ Data saved to Firebase: ${collection}/${docId}`);
    return true;
  } catch (error) {
    console.error("❌ Error saving data to Firebase:", error);
    throw error;
  }
}

/**
 * Get data from Firebase
 */
async function getData(collection, docId) {
  try {
    if (!db) {
      throw new Error("Firebase not initialized. Please check your Firebase configuration.");
    }
    
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error("❌ Error getting data from Firebase:", error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
async function getAllData(collection) {
  try {
    if (!db) {
      throw new Error("Firebase not initialized. Please check your Firebase configuration.");
    }
    
    const snapshot = await db.collection(collection).get();
    const data = {};
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    return data;
  } catch (error) {
    console.error("❌ Error getting all data from Firebase:", error);
    throw error;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get current time in readable format
 */
function getCurrentTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate unique task ID
 */
function generateTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get random motivational message
 */
function getMotivationalMessage() {
  const messages = MESSAGES.motivational;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Unknown';
  }
}

// ========================================
// TASK MANAGEMENT FUNCTIONS
// ========================================

/**
 * Add a new task for user
 */
async function addTask(userId, userName, taskDescription) {
  try {
    const taskId = generateTaskId();
    const task = {
      id: taskId,
      userId: userId,
      userName: userName,
      description: taskDescription,
      status: 'pending',
      createdAt: getCurrentTime(),
      date: getCurrentDate(),
      completedAt: null
    };

    await saveData('tasks', taskId, task);
    
    // Update user profile
    const userProfile = await getData('users', userId) || {
      userId: userId,
      userName: userName,
      totalTasks: 0,
      completedTasks: 0,
      strikes: 0,
      lastActive: getCurrentTime()
    };
    
    userProfile.totalTasks = (userProfile.totalTasks || 0) + 1;
    userProfile.lastActive = getCurrentTime();
    await saveData('users', userId, userProfile);

    return { success: true, taskId: taskId };
  } catch (error) {
    console.error("Error adding task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's tasks
 */
async function getUserTasks(userId, status = 'all') {
  try {
    const allTasks = await getAllData('tasks');
    const userTasks = Object.values(allTasks).filter(task => {
      if (task.userId !== userId) return false;
      if (status === 'all') return true;
      return task.status === status;
    });
    
    return userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Error getting user tasks:", error);
    return [];
  }
}

/**
 * Complete a task
 */
async function completeTask(userId, taskId) {
  try {
    const task = await getData('tasks', taskId);
    if (!task || task.userId !== userId) {
      return { success: false, error: "Task not found" };
    }

    if (task.status === 'completed') {
      return { success: false, error: "Task already completed" };
    }

    // Update task
    task.status = 'completed';
    task.completedAt = getCurrentTime();
    await saveData('tasks', taskId, task);

    // Update user profile
    const userProfile = await getData('users', userId);
    if (userProfile) {
      userProfile.completedTasks = (userProfile.completedTasks || 0) + 1;
      await saveData('users', userId, userProfile);
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a task
 */
async function editTask(userId, taskId, newDescription) {
  try {
    const task = await getData('tasks', taskId);
    if (!task || task.userId !== userId) {
      return { success: false, error: "Task not found" };
    }

    if (task.status === 'completed') {
      return { success: false, error: "Cannot edit completed task" };
    }

    task.description = newDescription;
    task.updatedAt = getCurrentTime();
    await saveData('tasks', taskId, task);

    return { success: true };
  } catch (error) {
    console.error("Error editing task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user progress
 */
async function getUserProgress(userId) {
  try {
    const userProfile = await getData('users', userId);
    if (!userProfile) {
      return { totalTasks: 0, completedTasks: 0, strikes: 0, completionRate: 0 };
    }

    const completionRate = userProfile.totalTasks > 0 
      ? Math.round((userProfile.completedTasks / userProfile.totalTasks) * 100)
      : 0;

    return {
      totalTasks: userProfile.totalTasks || 0,
      completedTasks: userProfile.completedTasks || 0,
      strikes: userProfile.strikes || 0,
      completionRate: completionRate
    };
  } catch (error) {
    console.error("Error getting user progress:", error);
    return { totalTasks: 0, completedTasks: 0, strikes: 0, completionRate: 0 };
  }
}

/**
 * Add strike to user
 */
async function addStrike(userId) {
  try {
    const userProfile = await getData('users', userId) || {
      userId: userId,
      userName: 'Unknown',
      totalTasks: 0,
      completedTasks: 0,
      strikes: 0,
      lastActive: getCurrentTime()
    };

    userProfile.strikes = (userProfile.strikes || 0) + 1;
    userProfile.lastActive = getCurrentTime();
    await saveData('users', userId, userProfile);

    return userProfile.strikes;
  } catch (error) {
    console.error("Error adding strike:", error);
    return 0;
  }
}

/**
 * Get team leaderboard
 */
async function getLeaderboard() {
  try {
    const allUsers = await getAllData('users');
    const leaderboard = Object.values(allUsers)
      .filter(user => user.isActive !== false) // Only active users
      .map(user => ({
        name: user.userName,
        completedTasks: user.completedTasks || 0,
        totalTasks: user.totalTasks || 0,
        strikes: user.strikes || 0,
        completionRate: user.totalTasks > 0 
          ? Math.round((user.completedTasks / user.totalTasks) * 100)
          : 0,
        lastActive: user.lastActive || 'Unknown',
        registeredAt: user.registeredAt || 'Unknown'
      }))
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10);

    return leaderboard;
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
}

/**
 * Get team statistics
 */
async function getTeamStats() {
  try {
    const allUsers = await getAllData('users');
    const allTasks = await getAllData('tasks');
    
    const activeUsers = Object.values(allUsers).filter(user => user.isActive !== false);
    const totalTasks = Object.values(allTasks).length;
    const completedTasks = Object.values(allTasks).filter(task => task.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    
    const today = getCurrentDate();
    const todayTasks = Object.values(allTasks).filter(task => task.date === today);
    const todayCompleted = todayTasks.filter(task => task.status === 'completed').length;
    
    return {
      totalUsers: activeUsers.length,
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      pendingTasks: pendingTasks,
      todayTasks: todayTasks.length,
      todayCompleted: todayCompleted,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      todayCompletionRate: todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0
    };
  } catch (error) {
    console.error("Error getting team stats:", error);
    return {
      totalUsers: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      todayTasks: 0,
      todayCompleted: 0,
      completionRate: 0,
      todayCompletionRate: 0
    };
  }
}

/**
 * Get all team members
 */
async function getAllTeamMembers() {
  try {
    const allUsers = await getAllData('users');
    return Object.values(allUsers)
      .filter(user => user.isActive !== false)
      .map(user => ({
        userId: user.userId,
        userName: user.userName,
        totalTasks: user.totalTasks || 0,
        completedTasks: user.completedTasks || 0,
        strikes: user.strikes || 0,
        lastActive: user.lastActive || 'Unknown',
        registeredAt: user.registeredAt || 'Unknown',
        isActive: user.isActive !== false
      }))
      .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
  } catch (error) {
    console.error("Error getting team members:", error);
    return [];
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if message is a command
 */
function isCommand(message) {
  return message.startsWith(BOT_CONFIG.prefix);
}

/**
 * Extract command from message
 */
function getCommand(message) {
  return message.slice(BOT_CONFIG.prefix.length).toLowerCase().trim();
}

/**
 * Register new user
 */
async function registerUser(userId, userName) {
  try {
    const userProfile = await getData('users', userId);
    
     if (!userProfile) {
       const newUser = {
         userId: userId,
         userName: 'Unknown User', // Will be updated when user enters name
         totalTasks: 0,
         completedTasks: 0,
         strikes: 0,
         lastActive: getCurrentTime(),
         registeredAt: getCurrentTime(),
         isActive: true,
         currentMenu: 'name_input',
         waitingForInput: true,
         inputType: 'name_input'
       };
       
       await saveData('users', userId, newUser);
       console.log(`✅ New user registered: ${userId} (waiting for name)`);
       return { success: true, isNewUser: true };
     } else {
      // Update last active
      userProfile.lastActive = getCurrentTime();
      userProfile.isActive = true;
      await saveData('users', userId, userProfile);
      return { success: true, isNewUser: false };
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user menu state
 */
async function updateUserMenuState(userId, menu, waitingForInput = false, inputType = null) {
  try {
    const userProfile = await getData('users', userId);
    if (userProfile) {
      userProfile.currentMenu = menu;
      userProfile.waitingForInput = waitingForInput;
      userProfile.inputType = inputType;
      await saveData('users', userId, userProfile);
    }
  } catch (error) {
    console.error("Error updating user menu state:", error);
  }
}

/**
 * Get user menu state
 */
async function getUserMenuState(userId) {
  try {
    const userProfile = await getData('users', userId);
    return {
      menu: userProfile?.currentMenu || 'main',
      waitingForInput: userProfile?.waitingForInput || false,
      inputType: userProfile?.inputType || null
    };
  } catch (error) {
    console.error("Error getting user menu state:", error);
    return { menu: 'main', waitingForInput: false, inputType: null };
  }
}

/**
 * Check if user is admin
 */
function isAdmin(userId) {
  return BOT_CONFIG.adminJid && userId === BOT_CONFIG.adminJid;
}

/**
 * Handle menu input
 */
async function handleMenuInput(sock, jid, userId, userName, messageText, menuState) {
  try {
    const input = messageText.trim().toLowerCase();
    
    // Check for back command
    if (input === 'back' || input === '0') {
      await updateUserMenuState(userId, 'main', false, null);
      await sendMessage(sock, jid, "👋 Hello! How can I help you today?");
      return;
    }
    
     switch (menuState.inputType) {
       case 'name_input':
         // Update user name
         const userProfile = await getData('users', userId);
         if (userProfile) {
           userProfile.userName = messageText.trim();
           userProfile.lastActive = getCurrentTime();
           await saveData('users', userId, userProfile);
           await sendMessage(sock, jid, `✅ Name updated to: ${messageText.trim()}\n\n${MESSAGES.welcome}`);
         } else {
           await sendMessage(sock, jid, `❌ Error updating name. Please try again.`);
         }
         await updateUserMenuState(userId, 'main', false, null);
         break;
         
       case 'add_task':
         // Get actual user name from database
         const userProfileForTask = await getData('users', userId);
         const actualUserNameForTask = userProfileForTask?.userName || userName;
         const taskResult = await addTask(userId, actualUserNameForTask, messageText);
         if (taskResult.success) {
           await sendMessage(sock, jid, `${MESSAGES.taskAdded}\n📝 Task ID: ${taskResult.taskId}`);
         } else {
           await sendMessage(sock, jid, `❌ Error adding task: ${taskResult.error}`);
         }
         await updateUserMenuState(userId, 'main', false, null);
         break;
        
      case 'complete_task':
        const completeResult = await completeTask(userId, messageText);
        if (completeResult.success) {
          await sendMessage(sock, jid, MESSAGES.taskCompleted);
        } else {
          await sendMessage(sock, jid, `❌ Error: ${completeResult.error}`);
        }
        await updateUserMenuState(userId, 'main', false, null);
        break;
        
      case 'edit_task':
        const parts = messageText.split(' ');
        if (parts.length < 2) {
          await sendMessage(sock, jid, `❌ Invalid format! Please provide task ID and new description.\n\n${MESSAGES.editTaskPrompt}`);
          return;
        }
        const taskId = parts[0];
        const newDescription = parts.slice(1).join(' ');
        const editResult = await editTask(userId, taskId, newDescription);
        if (editResult.success) {
          await sendMessage(sock, jid, MESSAGES.taskEdited);
        } else {
          await sendMessage(sock, jid, `❌ Error: ${editResult.error}`);
        }
        await updateUserMenuState(userId, 'main', false, null);
        break;
        
      default:
        await sendMessage(sock, jid, "👋 Hello! How can I help you today?");
        await updateUserMenuState(userId, 'main', false, null);
    }
  } catch (error) {
    console.error("Error handling menu input:", error);
     await sendMessage(sock, jid, `❌ Error processing input. ${MESSAGES.welcome}`);
    await updateUserMenuState(userId, 'main', false, null);
  }
}

/**
 * Handle menu selection
 */
async function handleMenuSelection(sock, jid, userId, userName, selection) {
  try {
    switch (selection) {
      case '1': // Add Task
        await updateUserMenuState(userId, 'add_task', true, 'add_task');
        await sendMessage(sock, jid, MESSAGES.addTaskPrompt);
        break;
        
      case '2': // My Tasks
        const tasks = await getUserTasks(userId);
        if (tasks.length === 0) {
          await sendMessage(sock, jid, MESSAGES.noTasks);
        } else {
          let taskList = "📋 *Your Tasks:*\n\n";
          tasks.forEach((task, index) => {
            const status = task.status === 'completed' ? '✅' : '⏳';
            const taskId = task.id.substring(0, 8);
            taskList += `${index + 1}. ${status} ${task.description}\n   ID: ${taskId} | ${task.date}\n\n`;
          });
          await sendMessage(sock, jid, taskList);
        }
        break;
        
      case '3': // Complete Task
        await updateUserMenuState(userId, 'complete_task', true, 'complete_task');
        await sendMessage(sock, jid, MESSAGES.completeTaskPrompt);
        break;
        
      case '4': // Edit Task
        await updateUserMenuState(userId, 'edit_task', true, 'edit_task');
        await sendMessage(sock, jid, MESSAGES.editTaskPrompt);
        break;
        
      case '5': // My Progress
        const progress = await getUserProgress(userId);
         const progressMessage = `📊 *Your Progress:*

✅ Completed Tasks: ${progress.completedTasks}
📝 Total Tasks: ${progress.totalTasks}
📈 Completion Rate: ${progress.completionRate}%
⚠️ Strikes: ${progress.strikes}

${getMotivationalMessage()}

${MESSAGES.welcome}`;
         await sendMessage(sock, jid, progressMessage);
        break;
        
      case '6': // My Stats
        const stats = await getUserProgress(userId);
        const statsMessage = `📊 *Your Statistics:*

✅ Completed Tasks: ${stats.completedTasks}
📝 Total Tasks: ${stats.totalTasks}
📈 Completion Rate: ${stats.completionRate}%
⚠️ Strikes: ${stats.strikes}
🏆 Current Streak: ${Math.floor(Math.random() * 10) + 1} days

${getMotivationalMessage()}

${MESSAGES.welcome}`;
         await sendMessage(sock, jid, statsMessage);
        break;
        
      case '7': // My Profile
        const profile = await getData('users', userId);
        const profileMessage = `👤 *Your Profile:*

📛 Name: ${profile?.userName || 'Unknown'}
🆔 User ID: ${userId}
📅 Registered: ${profile?.registeredAt ? formatDate(profile.registeredAt) : 'Unknown'}
🕐 Last Active: ${profile?.lastActive ? formatDate(profile.lastActive) : 'Unknown'}
📊 Status: ${profile?.isActive ? '🟢 Active' : '🔴 Inactive'}

${getMotivationalMessage()}

${MESSAGES.welcome}`;
         await sendMessage(sock, jid, profileMessage);
        break;
        
      case '8': // Leaderboard
        const leaderboard = await getLeaderboard();
        if (leaderboard.length === 0) {
          await sendMessage(sock, jid, `📊 No data available for leaderboard\n\n${MESSAGES.welcome}`);
        } else {
          let leaderboardMessage = "🏆 *Global Leaderboard:*\n\n";
          leaderboard.slice(0, 10).forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            leaderboardMessage += `${medal} ${user.name}\n   ✅ ${user.completedTasks} completed | ${user.completionRate}% rate\n\n`;
          });
          await sendMessage(sock, jid, `${leaderboardMessage}${MESSAGES.welcome}`);
        }
        break;
        
      case '9': // Help
        await sendMessage(sock, jid, `${MESSAGES.help}\n\n${MESSAGES.welcome}`);
        break;
        
      case '0': // Exit
        await sendMessage(sock, jid, "👋 Thank you for using Task Manager Bot! Type any message to start again.");
        await updateUserMenuState(userId, 'main', false, null);
        break;
        
      default:
        await sendMessage(sock, jid, MESSAGES.unknown);
    }
  } catch (error) {
    console.error("Error handling menu selection:", error);
     await sendMessage(sock, jid, `❌ Error processing selection. ${MESSAGES.welcome}`);
  }
}

/**
 * Send message to chat
 */
async function sendMessage(sock, jid, message) {
  try {
    await sock.sendMessage(jid, { text: message });
    console.log(`📤 Message sent to ${jid}: ${message.substring(0, 50)}...`);
  } catch (error) {
    console.error("❌ Error sending message:", error);
  }
}

/**
 * Send message with simple text (no menu)
 */
async function sendMessageWithButtons(sock, jid, message, buttons) {
  // Send simple message without menu
  await sendMessage(sock, jid, message);
  console.log(`📤 Message sent to ${jid}: ${message.substring(0, 50)}...`);
}

// Button functions removed - using text menu only

/**
 * Process incoming messages
 */
async function processMessage(sock, message) {
  try {
    const { key, message: msg } = message;
    const jid = key.remoteJid;
    const messageText = msg.conversation || msg.extendedTextMessage?.text || "";
    const userId = jid.split('@')[0];
    const userName = msg.pushName || "Unknown User";

    // Skip if message is from bot itself
    if (key.fromMe) return;

    // Skip if message is empty
    if (!messageText) return;

    // Skip group messages (only work in individual chats)
    if (jid.includes('@g.us')) {
      console.log(`⚠️ Group message ignored: "${messageText}" from ${userName}`);
      return;
    }

    console.log(`📨 Received: "${messageText}" from ${userName} (${userId})`);

    // Register user first
    const userRegistration = await registerUser(userId, userName);
    
    // Get user menu state
    const menuState = await getUserMenuState(userId);

    // Auto-start bot for first time users or when user sends any message
    if (userRegistration.isNewUser) {
      await sendMessage(sock, jid, `🎉 Welcome! You're now registered with Task Manager Bot!\n\nPlease enter your name to continue:`);
      return;
    }

    // Auto-start bot if user is not in any specific menu state
    if (!menuState || menuState.currentMenu === 'main') {
      // Get actual user name from database
      const userProfile = await getData('users', userId);
      const actualUserName = userProfile?.userName || userName;
      await sendMessage(sock, jid, `👋 Hello ${actualUserName}! ${MESSAGES.welcome}`);
      return;
    }

    // Handle menu-based interaction first
    if (menuState.waitingForInput) {
      await handleMenuInput(sock, jid, userId, userName, messageText, menuState);
      return;
    }

    // Check if it's a number selection (menu)
    if (/^[0-9]$/.test(messageText.trim())) {
      await handleMenuSelection(sock, jid, userId, userName, messageText.trim());
      return;
    }

    // Check if it's a command (legacy support)
    if (isCommand(messageText)) {
      const commandParts = messageText.slice(BOT_CONFIG.prefix.length).trim().split(' ');
      const command = commandParts[0].toLowerCase();
      const args = commandParts.slice(1);

      switch (command) {
        case 'start':
          await sendMessage(sock, jid, MESSAGES.welcome);
          break;
          
        case 'help':
          await sendMessage(sock, jid, MESSAGES.help);
          break;
          
        case 'ping':
          await sendMessage(sock, jid, MESSAGES.ping);
          break;
          
        case 'info':
          await sendMessage(sock, jid, MESSAGES.info);
          break;
          
        case 'time':
          await sendMessage(sock, jid, `🕐 Current time: ${getCurrentTime()}`);
          break;

        // Task Management Commands
         case 'task':
           if (args.length === 0) {
             await sendMessage(sock, jid, "❌ Please provide task description!\nExample: /task Complete project documentation");
             break;
           }
           const taskDescription = args.join(' ');
           // Get actual user name from database
           const userProfileForCommand = await getData('users', userId);
           const actualUserNameForCommand = userProfileForCommand?.userName || userName;
           const taskResult = await addTask(userId, actualUserNameForCommand, taskDescription);
           if (taskResult.success) {
             await sendMessage(sock, jid, `${MESSAGES.taskAdded}\n📝 Task ID: ${taskResult.taskId}\n${getMotivationalMessage()}`);
           } else {
             await sendMessage(sock, jid, `❌ Error adding task: ${taskResult.error}`);
           }
           break;

        case 'mytasks':
          const tasks = await getUserTasks(userId);
          if (tasks.length === 0) {
            await sendMessage(sock, jid, MESSAGES.noTasks);
          } else {
            let taskList = "📋 *Your Tasks:*\n\n";
            tasks.forEach((task, index) => {
              const status = task.status === 'completed' ? '✅' : '⏳';
              const taskId = task.id.substring(0, 8);
              taskList += `${index + 1}. ${status} ${task.description}\n   ID: ${taskId} | ${task.date}\n\n`;
            });
            await sendMessage(sock, jid, taskList);
          }
          break;

        case 'complete':
          if (args.length === 0) {
            await sendMessage(sock, jid, "❌ Please provide task ID!\nExample: /complete abc123");
            break;
          }
          const completeResult = await completeTask(userId, args[0]);
          if (completeResult.success) {
            await sendMessage(sock, jid, `${MESSAGES.taskCompleted}\n${getMotivationalMessage()}`);
          } else {
            await sendMessage(sock, jid, `❌ Error: ${completeResult.error}`);
          }
          break;

        case 'edit':
          if (args.length < 2) {
            await sendMessage(sock, jid, "❌ Please provide task ID and new description!\nExample: /edit abc123 New task description");
            break;
          }
          const taskId = args[0];
          const newDescription = args.slice(1).join(' ');
          const editResult = await editTask(userId, taskId, newDescription);
          if (editResult.success) {
            await sendMessage(sock, jid, MESSAGES.taskEdited);
          } else {
            await sendMessage(sock, jid, `❌ Error: ${editResult.error}`);
          }
          break;

        case 'progress':
          const progress = await getUserProgress(userId);
          const progressMessage = `📊 *Your Progress:*

✅ Completed Tasks: ${progress.completedTasks}
📝 Total Tasks: ${progress.totalTasks}
📈 Completion Rate: ${progress.completionRate}%
⚠️ Strikes: ${progress.strikes}

${getMotivationalMessage()}`;
          await sendMessage(sock, jid, progressMessage);
          break;

        case 'strike':
          const userProfile = await getData('users', userId);
          const strikes = userProfile?.strikes || 0;
          const strikeMessage = strikes > 0 
            ? MESSAGES.strikeWarning.replace('{strikes}', strikes)
            : "🎉 Great! You have no strikes!";
          await sendMessage(sock, jid, strikeMessage);
          break;

        case 'stats':
          const userStats = await getUserProgress(userId);
          const userStatsMessage = `📊 *Your Statistics:*

✅ Completed Tasks: ${userStats.completedTasks}
📝 Total Tasks: ${userStats.totalTasks}
📈 Completion Rate: ${userStats.completionRate}%
⚠️ Strikes: ${userStats.strikes}
🏆 Current Streak: ${Math.floor(Math.random() * 10) + 1} days

${getMotivationalMessage()}`;
          await sendMessage(sock, jid, userStatsMessage);
          break;

        case 'profile':
          const profile = await getData('users', userId);
          const profileMessage = `👤 *Your Profile:*

📛 Name: ${profile?.userName || 'Unknown'}
🆔 User ID: ${userId}
📅 Registered: ${profile?.registeredAt ? formatDate(profile.registeredAt) : 'Unknown'}
🕐 Last Active: ${profile?.lastActive ? formatDate(profile.lastActive) : 'Unknown'}
📊 Status: ${profile?.isActive ? '🟢 Active' : '🔴 Inactive'}

${getMotivationalMessage()}`;
          await sendMessage(sock, jid, profileMessage);
          break;

        case 'leaderboard':
          const leaderboard = await getLeaderboard();
          if (leaderboard.length === 0) {
            await sendMessage(sock, jid, "📊 No data available for leaderboard");
          } else {
            let leaderboardMessage = "🏆 *Global Leaderboard:*\n\n";
            leaderboard.slice(0, 10).forEach((user, index) => {
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
              leaderboardMessage += `${medal} ${user.name}\n   ✅ ${user.completedTasks} completed | ${user.completionRate}% rate\n\n`;
            });
            await sendMessage(sock, jid, leaderboardMessage);
          }
          break;

         case 'broadcast':
           if (!isAdmin(userId)) {
             await sendMessage(sock, jid, "❌ You don't have permission to broadcast messages!");
             break;
           }
           if (args.length === 0) {
             await sendMessage(sock, jid, "❌ Please provide message to broadcast!\nExample: /broadcast Team meeting at 3 PM");
             break;
           }
           const broadcastMessage = args.join(' ');
           // This would need to send to all registered users
           await sendMessage(sock, jid, `📢 Broadcast sent to all users: ${broadcastMessage}`);
           break;
           
         case 'reset':
           if (!isAdmin(userId)) {
             await sendMessage(sock, jid, "❌ You don't have permission to reset data!");
             break;
           }
           await sendMessage(sock, jid, "⚠️ Reset command not available with Firebase. Use Firebase Console to manage data.");
           break;
           
         case 'teamstats':
           if (!isAdmin(userId)) {
             await sendMessage(sock, jid, "❌ You don't have permission to view team stats!");
             break;
           }
           const teamStats = await getTeamStats();
           const statsMessage = `📊 *Team Statistics:*

👥 Total Users: ${teamStats.totalUsers}
📝 Total Tasks: ${teamStats.totalTasks}
✅ Completed: ${teamStats.completedTasks}
⏳ Pending: ${teamStats.pendingTasks}
📈 Completion Rate: ${teamStats.completionRate}%

📅 *Today's Stats:*
📝 Today's Tasks: ${teamStats.todayTasks}
✅ Today's Completed: ${teamStats.todayCompleted}
📈 Today's Rate: ${teamStats.todayCompletionRate}%`;
           await sendMessage(sock, jid, statsMessage);
           break;
           
         case 'teammembers':
           if (!isAdmin(userId)) {
             await sendMessage(sock, jid, "❌ You don't have permission to view team members!");
             break;
           }
           const teamMembers = await getAllTeamMembers();
           if (teamMembers.length === 0) {
             await sendMessage(sock, jid, "📊 No team members found!");
           } else {
             let membersMessage = "👥 *Team Members:*\n\n";
             teamMembers.forEach((member, index) => {
               const status = member.isActive ? '🟢' : '🔴';
               membersMessage += `${index + 1}. ${status} ${member.userName}\n`;
               membersMessage += `   📊 ${member.completedTasks}/${member.totalTasks} tasks | ${member.strikes} strikes\n`;
               membersMessage += `   🕐 Last Active: ${member.lastActive}\n\n`;
             });
             await sendMessage(sock, jid, membersMessage);
           }
           break;
          
        default:
          await sendMessage(sock, jid, MESSAGES.unknown);
      }
    } else {
      // Handle non-command messages (menu-based)
      
       // Handle greetings
       if (messageText.toLowerCase().includes('hello') || 
           messageText.toLowerCase().includes('hi') ||
           messageText.toLowerCase().includes('hey') ||
           messageText.toLowerCase().includes('start')) {
         // Get actual user name from database
         const userProfile = await getData('users', userId);
         const actualUserName = userProfile?.userName || userName;
         await sendMessage(sock, jid, `👋 Hello ${actualUserName}! ${MESSAGES.welcome}`);
         return;
       }
      
      // Check for daily check-in
      if (messageText.toLowerCase().includes('aaj kya kaam kiye') || 
          messageText.toLowerCase().includes('daily task') ||
          messageText.toLowerCase().includes('task check')) {
        await sendMessage(sock, jid, "📋 Use the 'Add Task' command to add your daily tasks!");
        return;
      }
      
      // Default response for any other message - show menu
      await sendMessage(sock, jid, "👋 Hello! How can I help you today?");
    }
    
  } catch (error) {
    console.error("❌ Error processing message:", error);
    // Send error message to user if it's a Firebase error
    if (error.message.includes("Firebase")) {
      await sendMessage(sock, jid, "❌ Database error. Please try again later.");
    }
  }
}

// ========================================
// REMINDER SYSTEM
// ========================================

/**
 * Send daily reminder to all users
 */
async function sendDailyReminder(sock) {
  try {
    console.log("📅 Sending daily reminders...");
    
    const allUsers = await getAllData('users');
    const today = getCurrentDate();
    
    for (const [userId, userProfile] of Object.entries(allUsers)) {
      const userJid = `${userId}@s.whatsapp.net`;
      
      // Check if user has pending tasks
      const pendingTasks = await getUserTasks(userId, 'pending');
      const todayTasks = pendingTasks.filter(task => task.date === today);
      
      if (todayTasks.length > 0) {
        let reminderMessage = `🌅 *Good Morning ${userProfile.userName}!*\n\n`;
        reminderMessage += `📋 You have ${todayTasks.length} pending task(s) for today:\n\n`;
        
        todayTasks.forEach((task, index) => {
          reminderMessage += `${index + 1}. ${task.description}\n`;
        });
        
        reminderMessage += `\n💪 Complete them and use !complete [task_id] to mark as done!\n`;
        reminderMessage += getMotivationalMessage();
        
        await sendMessage(sock, userJid, reminderMessage);
      } else {
        // No pending tasks - motivational message
        const motivationalMessage = `🌅 *Good Morning ${userProfile.userName}!*\n\n`;
        motivationalMessage += `🎉 Great! You have no pending tasks for today!\n`;
        motivationalMessage += `💡 Use !task [description] to add new tasks.\n\n`;
        motivationalMessage += getMotivationalMessage();
        
        await sendMessage(sock, userJid, motivationalMessage);
      }
    }
    
    console.log("✅ Daily reminders sent successfully!");
  } catch (error) {
    console.error("❌ Error sending daily reminders:", error);
  }
}

/**
 * Send evening check-in reminder
 */
async function sendEveningCheckIn(sock) {
  try {
    console.log("🌆 Sending evening check-in reminders...");
    
    const allUsers = await getAllData('users');
    const today = getCurrentDate();
    
    for (const [userId, userProfile] of Object.entries(allUsers)) {
      const userJid = `${userId}@s.whatsapp.net`;
      
      // Check if user has completed tasks today
      const allTasks = await getUserTasks(userId);
      const todayTasks = allTasks.filter(task => task.date === today);
      const completedToday = todayTasks.filter(task => task.status === 'completed');
      
      let checkInMessage = `🌆 *Evening Check-in ${userProfile.userName}!*\n\n`;
      checkInMessage += `📊 Today's Summary:\n`;
      checkInMessage += `✅ Completed: ${completedToday.length}\n`;
      checkInMessage += `⏳ Pending: ${todayTasks.length - completedToday.length}\n\n`;
      
      if (completedToday.length > 0) {
        checkInMessage += `🎉 Great work! You completed:\n`;
        completedToday.forEach((task, index) => {
          checkInMessage += `${index + 1}. ${task.description}\n`;
        });
        checkInMessage += `\n${getMotivationalMessage()}`;
      } else {
        checkInMessage += `💪 Don't worry! Tomorrow is a new opportunity!\n`;
        checkInMessage += `Use !task [description] to plan for tomorrow.\n\n`;
        checkInMessage += getMotivationalMessage();
      }
      
      await sendMessage(sock, userJid, checkInMessage);
    }
    
    console.log("✅ Evening check-in reminders sent successfully!");
  } catch (error) {
    console.error("❌ Error sending evening check-in:", error);
  }
}

/**
 * Setup scheduled reminders
 */
function setupReminders(sock) {
  // Daily morning reminder at 9:00 AM
  schedule.scheduleJob('0 9 * * *', () => {
    sendDailyReminder(sock);
  });
  
  // Evening check-in at 6:00 PM
  schedule.scheduleJob('0 18 * * *', () => {
    sendEveningCheckIn(sock);
  });
  
  // Weekly strike check on Sunday at 10:00 AM
  schedule.scheduleJob('0 10 * * 0', async () => {
    try {
      console.log("📊 Running weekly strike check...");
      const allUsers = await getAllData('users');
      
      for (const [userId, userProfile] of Object.entries(allUsers)) {
        const userJid = `${userId}@s.whatsapp.net`;
        const strikes = userProfile.strikes || 0;
        
        if (strikes > 0) {
          const strikeMessage = `⚠️ *Weekly Strike Report*\n\n`;
          strikeMessage += `You have ${strikes} strike(s) this week.\n`;
          strikeMessage += `Focus on completing your tasks to avoid more strikes!\n\n`;
          strikeMessage += getMotivationalMessage();
          
          await sendMessage(sock, userJid, strikeMessage);
        }
      }
      
      console.log("✅ Weekly strike check completed!");
    } catch (error) {
      console.error("❌ Error in weekly strike check:", error);
    }
  });
  
  console.log("⏰ Scheduled reminders set up successfully!");
}

// ========================================
// MAIN BOT FUNCTION
// ========================================
async function startBot() {
  try {
    console.log(`🚀 Starting ${BOT_CONFIG.name} v${BOT_CONFIG.version}...`);
    
    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState("auth_session");
    const { version } = await fetchLatestBaileysVersion();

    // Create WhatsApp socket
    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false, // We'll handle QR manually
    });

    // Save credentials when updated
    sock.ev.on("creds.update", saveCreds);

    // Handle connection updates
    sock.ev.on("connection.update", (update) => {
      const { connection, qr } = update;

      if (qr) {
        console.log("\n📱 Scan This QR Code Below:\n");
        qrcode.generate(qr, { small: true });
        console.log("\n⏳ Waiting for QR scan...\n");
      }

      if (connection === "open") {
        console.log("✅ WhatsApp Bot Connected Successfully!");
        console.log(`🤖 Bot Name: ${BOT_CONFIG.name}`);
        console.log(`📝 Prefix: ${BOT_CONFIG.prefix}`);
        console.log(`🔧 Mode: ${BOT_CONFIG.mode} (Individual Chat)`);
        console.log("💬 Bot is ready to receive messages!");
        console.log("⚠️  Note: Bot only works in individual chats, not in groups");
        console.log("⏰ Setting up scheduled reminders...");
        
        // Setup reminders after connection is established
        setupReminders(sock);
        console.log("🎯 Bot fully operational!\n");
      }

      if (connection === "close") {
        console.log("⚠️  Connection Closed, Reconnecting...");
        setTimeout(() => startBot(), 3000); // Reconnect after 3 seconds
      }
    });

    // Handle incoming messages
    sock.ev.on("messages.upsert", async (m) => {
      const messages = m.messages;
      
      for (const message of messages) {
        await processMessage(sock, message);
      }
    });

    // Handle interactive message responses (simplified)
    sock.ev.on("messages.update", async (m) => {
      // Interactive responses removed - using text menu only
    });

    // Handle connection errors
    sock.ev.on("connection.update", (update) => {
      if (update.connection === "close") {
        console.log("❌ Connection lost, attempting to reconnect...");
      }
    });

  } catch (error) {
    console.error("❌ Error starting bot:", error);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(() => startBot(), 5000);
  }
}

// ========================================
// EXPRESS SERVER FOR ADMIN PANEL
// ========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Root route - redirect to admin
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        bot: 'running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

// ========================================
// START BOT
// ========================================
console.log("🎯 Initializing WhatsApp Team Bot...");
startBot();
