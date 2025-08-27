# Heroku Deployment Guide

## Prerequisites
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Create a Heroku account: https://signup.heroku.com/

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create a new Heroku app
```bash
heroku create your-app-name
```

### 3. Add buildpacks
```bash
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs
```

### 4. Set environment variables
```bash
heroku config:set SECRET_KEY="your-production-secret-key-here"
heroku config:set REACT_APP_API_URL="https://your-app-name.herokuapp.com/api"
```

### 5. Deploy to Heroku
```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

### 6. Open your deployed app
```bash
heroku open
```

## Configuration Files Created
- `Procfile`: Tells Heroku how to run your app
- `runtime.txt`: Specifies Python version
- `requirements.txt`: Python dependencies (copied to root)
- `package.json`: Node.js build configuration

## Important Notes
- Replace `your-app-name` with your actual Heroku app name
- Generate a strong SECRET_KEY for production
- The app will be available at `https://your-app-name.herokuapp.com`
- SQLite database will reset on each deployment (consider upgrading to PostgreSQL for production)

## Troubleshooting
- View logs: `heroku logs --tail`
- Check app status: `heroku ps`
- Restart app: `heroku restart`