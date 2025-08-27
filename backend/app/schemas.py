from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
import re


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: str


class UserCreate(UserBase):
    password: str
    confirm_password: str

    @validator('email')
    def validate_email_domain(cls, v):
        if not v.endswith('@getcovered.io'):
            raise ValueError('Email must be from @getcovered.io domain')
        return v

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', v):
            raise ValueError('Password must contain at least one symbol')
        
        # Check for repeated characters (3+ consecutive)
        for i in range(len(v) - 2):
            if v[i] == v[i+1] == v[i+2]:
                raise ValueError('Password cannot contain 3 or more consecutive repeated characters')
        
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    def validate_password_email_difference(self):
        """Validate that password differs from email local part by at least 5 characters"""
        email_local = self.email.split('@')[0]
        password = self.password
        
        # Compare character by character
        differences = sum(1 for a, b in zip(email_local.lower(), password.lower()) if a != b)
        differences += abs(len(email_local) - len(password))
        
        if differences < 5:
            raise ValueError('Password must differ from email local part by at least 5 characters')


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: str
    last_name: str


class Token(BaseModel):
    access_token: str
    token_type: str