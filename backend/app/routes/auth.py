from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse, UserLogin, Token, UserUpdate
from ..auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user
)
from ..config import settings

router = APIRouter(prefix="/v1", tags=["auth-v1"])


@router.post("/admin-init-db-x7k9m2p4")
def initialize_database_with_test_data(db: Session = Depends(get_db)):
    """Initialize database with test data. Only works once when database is empty."""
    
    # Check if users already exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Database already initialized with {existing_users} users. Operation not allowed."
        )
    
    fake_users = [
        {
            "first_name": "John",
            "last_name": "Smith", 
            "email": "john.smith@getcovered.io",
            "password": "SecurePass123!@#"
        },
        {
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@getcovered.io", 
            "password": "StrongPwd456$%^"
        },
        {
            "first_name": "Michael",
            "last_name": "Brown",
            "email": "michael.brown@getcovered.io",
            "password": "ComplexKey789&*()"
        },
        {
            "first_name": "Emily",
            "last_name": "Davis",
            "email": "emily.davis@getcovered.io",
            "password": "PowerfulAuth012!@"
        },
        {
            "first_name": "David",
            "last_name": "Wilson",
            "email": "david.wilson@getcovered.io",
            "password": "RobustLogin345#$%"
        }
    ]
    
    try:
        created_users = []
        for user_data in fake_users:
            # Hash the password
            hashed_password = get_password_hash(user_data["password"])
            
            # Create user
            db_user = User(
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                email=user_data["email"],
                hashed_password=hashed_password
            )
            
            db.add(db_user)
            created_users.append(f"{user_data['first_name']} {user_data['last_name']}")
        
        db.commit()
        
        return {
            "message": f"Database initialized with {len(fake_users)} test users",
            "count": len(created_users),
            "sample_login": {
                "email": "john.smith@getcovered.io",
                "password": "SecurePass123!@#"
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Validate password vs email difference
    try:
        user.validate_password_email_difference()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=Token)
def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.first_name = user_update.first_name
    current_user.last_name = user_update.last_name
    
    db.commit()
    db.refresh(current_user)
    
    return current_user