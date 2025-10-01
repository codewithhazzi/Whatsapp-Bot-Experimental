# WhatsApp Team Bot

A powerful WhatsApp bot for team task management with Firebase integration and admin dashboard.

## Features

- 📱 **WhatsApp Integration** - Individual chat mode like Telegram
- 🔥 **Firebase Database** - Real-time data sync
- 📊 **Admin Dashboard** - Web-based management interface
- 📝 **Task Management** - Add, edit, complete tasks
- 👥 **User Management** - Team member tracking
- 📈 **Analytics** - Progress tracking and leaderboards
- ⏰ **Reminders** - Automated daily reminders
- 🎯 **Gamification** - Strikes system and motivational messages

## Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd wa-team-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 4. Firebase Setup
1. Create Firebase project
2. Enable Firestore Database
3. Generate service account key
4. Update `.env` with Firebase credentials

### 5. Run Bot
```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ADMIN_JID` | Your WhatsApp number | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `FIREBASE_PRIVATE_KEY` | Firebase service account key | ✅ |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | ✅ |
| `FIREBASE_API_KEY` | Firebase web API key | ✅ |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | ✅ |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ |
| `FIREBASE_APP_ID` | Firebase app ID | ✅ |

## Deployment

### Railway (Recommended)
1. Push code to GitHub
2. Connect Railway to GitHub
3. Add environment variables
4. Deploy!
5. Access admin panel at `https://your-app.railway.app/admin`

### Heroku
1. Create Heroku app
2. Add environment variables
3. Deploy from GitHub

### VPS
1. Setup Node.js on server
2. Clone repository
3. Install dependencies
4. Setup PM2 for process management
5. Configure environment variables

## Admin Dashboard

Access admin panel at:
- **Local**: `http://localhost:3000/admin`
- **Deployed**: `https://your-app.railway.app/admin`

Features:
- User management
- Task monitoring
- Analytics and reports
- System status
- Broadcast messages
- Real-time Firebase sync

## Bot Commands

- `/start` - Start bot
- `/task <description>` - Add new task
- `/mytasks` - View your tasks
- `/complete <task_id>` - Complete task
- `/edit <task_id> <new_description>` - Edit task
- `/progress` - View progress
- `/stats` - Detailed statistics
- `/profile` - Your profile
- `/leaderboard` - Global rankings

## Menu System

The bot uses a number-based menu system:
1. Add Task
2. My Tasks
3. Complete Task
4. Edit Task
5. My Progress
6. My Stats
7. My Profile
8. Leaderboard
9. Help
0. Exit

## File Structure

```
wa-team-bot/
├── index.js              # Main bot file
├── package.json          # Dependencies
├── .env                  # Environment variables
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── admin/               # Admin dashboard
│   ├── index.html       # Dashboard HTML
│   ├── style.css        # Dashboard styles
│   ├── script.js        # Dashboard logic
│   └── env-loader.js    # Environment loader
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review code comments

## Changelog

### v1.0
- Firebase integration
- Admin dashboard
- Menu-based interface
- Real-time status monitoring
- Team management features
- Basic WhatsApp bot
- Task management
- Local storage
- Command-based interface
