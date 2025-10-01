// Admin Panel Configuration
// This file loads environment variables for the admin dashboard

// Function to load environment variables from .env file
function loadEnvConfig() {
    // Since we can't directly read .env in browser, we'll create a config object
    // that can be updated with actual values from your .env file
    
    return {
        FIREBASE_PROJECT_ID: 'your-project-id',
        FIREBASE_PRIVATE_KEY: 'your-private-key',
        FIREBASE_CLIENT_EMAIL: 'your-client-email',
        FIREBASE_API_KEY: 'your-api-key',
        FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
        FIREBASE_STORAGE_BUCKET: 'your-project.appspot.com',
        FIREBASE_MESSAGING_SENDER_ID: '123456789',
        FIREBASE_APP_ID: 'your-app-id'
    };
}

// Get Firebase configuration
function getFirebaseConfig() {
    const env = loadEnvConfig();
    
    return {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadEnvConfig, getFirebaseConfig };
}
