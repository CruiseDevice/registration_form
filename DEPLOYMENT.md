# Production Deployment Guide

## 🚀 Live Application
**🔗 Deployed App: https://registration-form-2efade0d6bec.herokuapp.com/**

The application is fully deployed on Heroku with both FastAPI backend and React frontend served from a single app.

## 🎯 Quick Start (Using Existing Deployment)

### Test Users Available
You can immediately test the live application using these credentials:
- **Email**: `john.smith@getcovered.io`  
- **Password**: `SecurePass123!@#`

Other available test users:
- `sarah.johnson@getcovered.io` / `StrongPwd456$%^`
- `michael.brown@getcovered.io` / `ComplexKey789&*()`
- `emily.davis@getcovered.io` / `PowerfulAuth012!@`
- `david.wilson@getcovered.io` / `RobustLogin345#$%`

## 📦 Heroku Deployment Setup (New Deployment)

### Prerequisites
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Create a Heroku account: https://signup.heroku.com/
3. Ensure you're on the `main` branch with all changes committed

### Step-by-Step Deployment

#### 1. Login to Heroku
```bash
heroku login
```

#### 2. Create a new Heroku app
```bash
heroku create your-app-name
```

#### 3. Add buildpacks (in this order)
```bash
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs
```

#### 4. Set environment variables
```bash
heroku config:set SECRET_KEY="your-production-secret-key-$(date +%s)"
heroku config:set REACT_APP_API_URL="https://your-app-name.herokuapp.com/api/v1"
heroku config:set ADMIN_INIT_ENDPOINT="/admin-seed-$(date +%s)-$(openssl rand -hex 6)"
```

#### 5. Deploy to Heroku
```bash
git push heroku main
```

#### 6. Seed the production database (one-time)
After deployment, get your secure endpoint URL:
```bash
heroku config:get ADMIN_INIT_ENDPOINT
```

Then seed the database:
```bash
curl -X POST https://your-app-name.herokuapp.com/api/v1/YOUR_SECURE_ENDPOINT
```

#### 7. Open your deployed app
```bash
heroku open
```

## 🔧 Configuration Files

The following files are automatically created/configured for Heroku deployment:

### Core Deployment Files
- **`Procfile`**: Tells Heroku to run FastAPI backend
  ```
  web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

- **`.python-version`**: Specifies Python version (replaces deprecated runtime.txt)
  ```
  3.11
  ```

- **`requirements.txt`** (root): Python dependencies copied from backend
- **`package.json`** (root): Node.js build configuration with Heroku scripts

### Build Process Configuration
The root `package.json` includes special Heroku hooks:
```json
{
  "scripts": {
    "heroku-prebuild": "cd frontend && npm install",
    "heroku-postbuild": "cd frontend && npm run build && cp -r build ../"
  }
}
```

## 🏗️ Architecture & Features

### Full-Stack Integration
- **Backend**: FastAPI serves both API endpoints and React static files
- **Frontend**: React app built during deployment and served via FastAPI
- **Database**: SQLite with automatic table creation
- **Security**: JWT authentication, secure admin endpoints

### Key Production Features
1. **Static File Serving**: FastAPI configured to serve React build files
2. **SPA Routing Support**: Catch-all routing for React Router
3. **Environment-Based Configuration**: Secure endpoints via environment variables
4. **One-Time Database Seeding**: Secure endpoint that only works when DB is empty
5. **CORS Configuration**: Properly configured for production domain

## 🔒 Security Features

### Database Seeding Security
- **Obscure Endpoint**: Generated with timestamp + random hex
- **Environment Variable**: Endpoint path not stored in source code
- **POST-Only**: Cannot be accidentally triggered via browser
- **One-Time Use**: Only works when database is empty
- **Error on Repeat**: Returns 400 error if users already exist

### Production Security
- **Strong Secret Keys**: Auto-generated with entropy
- **CORS Protection**: Configured for production domain
- **JWT Tokens**: Secure authentication with expiration
- **Password Hashing**: bcrypt with strong requirements

## 📊 Environment Variables

### Required Environment Variables
```bash
SECRET_KEY=your-production-secret-key-1756322395
REACT_APP_API_URL=https://your-app-name.herokuapp.com/api/v1
ADMIN_INIT_ENDPOINT=/admin-seed-1756322395-7786f159f25a
```

### Optional Environment Variables
```bash
DATABASE_URL=sqlite:///./users.db  # Default SQLite
ACCESS_TOKEN_EXPIRE_MINUTES=30     # JWT expiration
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. API Routes Not Working
**Problem**: Getting 405 Method Not Allowed for `/api/login`
**Solution**: Ensure frontend is using correct API URL with `/v1` suffix:
```bash
heroku config:set REACT_APP_API_URL="https://your-app-name.herokuapp.com/api/v1"
```

#### 2. Frontend Build Fails
**Problem**: TailwindCSS dependencies not found during build
**Solution**: Dependencies moved to main `dependencies` (not `devDependencies`) in frontend/package.json

#### 3. Database Empty After Deployment
**Problem**: No test users available
**Solution**: Use the secure seed endpoint (one-time):
```bash
curl -X POST https://your-app-name.herokuapp.com/api/v1/$(heroku config:get ADMIN_INIT_ENDPOINT)
```

### Monitoring & Logs
```bash
# View real-time logs
heroku logs --tail

# Check app status
heroku ps

# Restart the app
heroku restart

# Check environment variables
heroku config
```

## 🔄 Updates & Redeployment

### For Code Changes
```bash
git add .
git commit -m "Your changes"
git push heroku main
```

### For Environment Variable Changes
```bash
heroku config:set VARIABLE_NAME="new-value"
# App automatically restarts
```

### Database Reset (if needed)
Since using SQLite, database resets on each deployment. To manually reset:
1. Redeploy the app
2. Use the seed endpoint again (if it was already used, it will return an error)

## ⚠️ Important Notes

### Production Considerations
- **Database**: SQLite resets on each deployment - consider PostgreSQL for production
- **File Storage**: Heroku has ephemeral filesystem - use external storage for uploads
- **Performance**: Free tier apps sleep after 30 minutes of inactivity
- **Scaling**: Consider paid tiers for production workloads

### Security Reminders
- Keep `SECRET_KEY` secure and unique per environment
- The admin seed endpoint can only be used once per deployment
- JWT tokens expire after 30 minutes (configurable)
- All passwords are hashed with bcrypt
