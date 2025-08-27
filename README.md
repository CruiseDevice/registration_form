# User Registration App

A modern, full-stack user registration application with a Python FastAPI backend and React TypeScript frontend. Features comprehensive password validation, real-time form validation, accessibility compliance, and a clean, professional UI.

## 🚀 Features

### Core Functionality
- **User Registration**: Complete registration flow with strict validation
- **User Authentication**: JWT-based login system  
- **Profile Management**: View and edit user profile information
- **Welcome Dashboard**: Personalized welcome experience

### Validation & Security
- **Email Validation**: Restricted to @getcovered.io domain only
- **Advanced Password Requirements**:
  - Minimum 12 characters
  - Must include uppercase, lowercase, number, and symbol
  - No 3+ consecutive repeated characters
  - Must differ from email local part by at least 5 characters
- **Real-time Validation**: Instant feedback on form fields
- **Password Strength Meter**: Visual indicator with detailed criteria
- **Secure Authentication**: JWT tokens with proper expiration

### User Experience
- **Accessibility First**: WCAG compliant with ARIA labels, keyboard navigation
- **Mobile Responsive**: Optimized for all device sizes
- **Professional Design**: Clean, modern interface with subtle borders
- **Loading States**: Clear feedback during async operations
- **Error Handling**: User-friendly error messages

## 🏗️ Architecture

### Backend (Python FastAPI)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas with validation
│   ├── database.py          # Database configuration
│   ├── auth.py              # Authentication utilities
│   └── routes/
│       └── auth.py          # Authentication routes
├── seed_data.py             # Database seeding script
└── requirements.txt         # Python dependencies
```

### Frontend (React TypeScript)
```
frontend/
├── src/
│   ├── components/
│   │   ├── RegistrationForm.tsx    # Registration form with validation
│   │   ├── LoginForm.tsx           # Login form
│   │   └── PasswordStrengthMeter.tsx # Password strength indicator
│   ├── pages/
│   │   ├── WelcomePage.tsx         # Welcome dashboard
│   │   └── ProfilePage.tsx         # Profile management
│   ├── utils/
│   │   ├── api.ts                  # API utilities
│   │   └── validation.ts           # Client-side validation
│   ├── types/
│   │   └── auth.ts                 # TypeScript interfaces
│   ├── App.tsx                     # Main application component
│   └── index.tsx                   # Application entry point
├── public/
│   └── index.html
├── package.json
└── tailwind.config.js              # Tailwind CSS configuration
```

## 🛠️ Setup Instructions

### Prerequisites
- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **npm**: 7 or higher

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations and seed data**:
   ```bash
   python seed_data.py
   ```

5. **Start the FastAPI server**:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at: `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

The application will be available at: `http://localhost:3000`

## 🧪 Testing the Application

### Test Users
The seed script creates 10 test users. You can login with any of these credentials:

**Example:**
- Email: `john.smith@getcovered.io`
- Password: `SecurePass123!@#`

**Other test users:**
- `sarah.johnson@getcovered.io` / `StrongPwd456$%^`
- `michael.brown@getcovered.io` / `ComplexKey789&*()`
- `emily.davis@getcovered.io` / `PowerfulAuth012!@`
- And 6 more...

### Registration Testing
Try creating a new account with:
- Email ending in `@getcovered.io`
- Password meeting all complexity requirements
- The password strength meter will guide you

## 🔗 API Endpoints

### Authentication Routes
- **POST** `/api/register` - User registration
- **POST** `/api/login` - User login  
- **GET** `/api/profile` - Get user profile (authenticated)
- **PUT** `/api/profile` - Update user profile (authenticated)

### Example API Usage

**Registration:**
```bash
curl -X POST "http://localhost:8000/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe", 
    "email": "john.doe@getcovered.io",
    "password": "SecurePassword123!",
    "confirm_password": "SecurePassword123!"
  }'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@getcovered.io",
    "password": "SecurePassword123!"
  }'
```

## 🗃️ Database Schema

### Users Table
```sql
users (
  id INTEGER PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL, 
  email VARCHAR UNIQUE NOT NULL,
  hashed_password VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory for production:

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
DATABASE_URL=sqlite:///./users.db
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### CORS Configuration
The backend is configured to accept requests from `http://localhost:3000` by default. Update `main.py` for production domains.

## 🚀 Production Deployment

### Backend Deployment
1. **Set environment variables**:
   ```bash
   export SECRET_KEY="your-production-secret-key"
   export DATABASE_URL="your-production-database-url"
   ```

2. **Install production dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run with Gunicorn**:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

### Frontend Deployment
1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Serve static files** using nginx, Apache, or CDN

### Database Migration
For production, consider using Alembic for database migrations:
```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## 🧑‍💻 Development

### Code Style
- **Backend**: Follows PEP 8 Python style guide
- **Frontend**: Uses TypeScript strict mode with ESLint rules
- **Formatting**: Consistent indentation and naming conventions

### Adding New Features
1. **Backend**: Add new routes in `app/routes/`
2. **Frontend**: Create new components in `src/components/`
3. **Database**: Update models in `app/models.py` and schemas in `app/schemas.py`

### Testing
```bash
# Backend testing (add pytest)
pip install pytest
pytest

# Frontend testing  
npm test
```
## 📝 AI-Assisted Development

This project was built using AI assistance. The complete development process, including all prompts and interactions across multiple AI platforms (Claude Web, Claude Code, Cursor AI), is documented in [`prompts.md`](./prompts.md).

**Key AI Tools Used:**
- Claude (Web Interface) - Project planning
- Claude Code - Full implementation
- Cursor AI Assistant - Debugging and iteration

**Development Approach:**
- Documentation-first prompt engineering
- Multi-tool AI assistance strategy
- Iterative problem-solving with AI feedback
- Real-time debugging and issue resolution