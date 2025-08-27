#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, User
from app.auth import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

def create_fake_users():
    """Create 10 fake users with @getcovered.io emails and valid passwords"""
    
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
        },
        {
            "first_name": "Jessica",
            "last_name": "Garcia",
            "email": "jessica.garcia@getcovered.io",
            "password": "MightyCode678^&*"
        },
        {
            "first_name": "Christopher",
            "last_name": "Martinez",
            "email": "christopher.martinez@getcovered.io",
            "password": "ValidSecret901!@#"
        },
        {
            "first_name": "Ashley",
            "last_name": "Anderson",
            "email": "ashley.anderson@getcovered.io",
            "password": "SecureToken234$%^"
        },
        {
            "first_name": "Matthew",
            "last_name": "Taylor",
            "email": "matthew.taylor@getcovered.io",
            "password": "StrongHash567&*()"
        },
        {
            "first_name": "Amanda",
            "last_name": "Thomas",
            "email": "amanda.thomas@getcovered.io",
            "password": "PowerAuth890!@#"
        }
    ]
    
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"Database already contains {existing_users} users. Skipping seed data.")
            return
        
        print("Creating 10 fake users with valid @getcovered.io emails...")
        
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
            print(f"✓ Created user: {user_data['first_name']} {user_data['last_name']} ({user_data['email']})")
        
        db.commit()
        print(f"\n🎉 Successfully created {len(fake_users)} fake users!")
        print("\nAll users have passwords that meet the requirements:")
        print("- At least 12 characters")
        print("- Contains uppercase, lowercase, number, and symbol")
        print("- No repeated characters (3+ consecutive)")
        print("- Different from email local part by at least 5 characters")
        
        print(f"\nYou can now test the application with any of these credentials.")
        print("Example login:")
        print("Email: john.smith@getcovered.io")
        print("Password: SecurePass123!@#")
        
    except Exception as e:
        print(f"Error creating seed data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_fake_users()