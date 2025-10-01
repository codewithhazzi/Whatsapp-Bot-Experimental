// Environment Variables Loader for Admin Panel
// This script loads environment variables from the main .env file

class EnvLoader {
    constructor() {
        this.env = {};
        this.loadEnv();
    }

    async loadEnv() {
        try {
            // Try to fetch the .env file from the parent directory
            const response = await fetch('../.env');
            if (response.ok) {
                const envText = await response.text();
                this.parseEnv(envText);
                console.log('✅ Environment variables loaded from .env file');
                console.log('Project ID from .env:', this.env.FIREBASE_PROJECT_ID);
            } else {
                console.log('⚠️ .env file not found, using default values');
                this.setDefaultValues();
                console.log('Project ID from defaults:', this.env.FIREBASE_PROJECT_ID);
            }
        } catch (error) {
            console.log('⚠️ Could not load .env file, using default values:', error.message);
            this.setDefaultValues();
            console.log('Project ID from defaults:', this.env.FIREBASE_PROJECT_ID);
        }
    }

    parseEnv(envText) {
        const lines = envText.split('\n');
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    this.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }

    setDefaultValues() {
        this.env = {
            FIREBASE_PROJECT_ID: 'nxctools',
            FIREBASE_PRIVATE_KEY: 'your-private-key',
            FIREBASE_CLIENT_EMAIL: 'your-client-email',
            FIREBASE_API_KEY: 'AIzaSyAN_BDgb9m0Mdr_oDXFTvZ5_oaf1TdGIFM',
            FIREBASE_AUTH_DOMAIN: 'nxctools.firebaseapp.com',
            FIREBASE_STORAGE_BUCKET: 'nxctools.firebasestorage.app',
            FIREBASE_MESSAGING_SENDER_ID: '1073879530371',
            FIREBASE_APP_ID: '1:1073879530371:web:feb4f664557773f62714b6'
        };
    }

    get(key, defaultValue = '') {
        return this.env[key] || defaultValue;
    }

    getFirebaseConfig() {
        return {
            apiKey: this.get('FIREBASE_API_KEY', 'AIzaSyAN_BDgb9m0Mdr_oDXFTvZ5_oaf1TdGIFM'),
            authDomain: this.get('FIREBASE_AUTH_DOMAIN', 'nxctools.firebaseapp.com'),
            projectId: this.get('FIREBASE_PROJECT_ID', 'nxctools'),
            storageBucket: this.get('FIREBASE_STORAGE_BUCKET', 'nxctools.firebasestorage.app'),
            messagingSenderId: this.get('FIREBASE_MESSAGING_SENDER_ID', '1073879530371'),
            appId: this.get('FIREBASE_APP_ID', '1:1073879530371:web:feb4f664557773f62714b6')
        };
    }
}

// Create global instance
window.envLoader = new EnvLoader();

// Function to get Firebase config (for backward compatibility)
function getFirebaseConfig() {
    return window.envLoader.getFirebaseConfig();
}
