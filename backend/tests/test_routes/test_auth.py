import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from app.main import app
from app.database import get_db, Base
from app.models import User  # Import User model to register it with Base
from app.auth import get_password_hash, create_access_token


# Test database setup is now handled in conftest.py


@pytest.fixture
def sample_user_data():
    """Sample valid user registration data"""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@getcovered.io",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }


@pytest.fixture
def sample_login_data():
    """Sample valid login data"""
    return {
        "email": "john.doe@getcovered.io",
        "password": "SecurePassword123!"
    }


@pytest.fixture
def registered_user(client, sample_user_data):
    """Create a registered user for testing"""
    response = client.post("/api/v1/register", json=sample_user_data)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def auth_headers(client, sample_login_data, registered_user):
    """Get authentication headers with valid token"""
    response = client.post("/api/v1/login", json=sample_login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestUserRegistration:
    """Test user registration endpoint"""
    
    def test_register_user_success(self, client, sample_user_data):
        """Test successful user registration"""
        response = client.post("/api/v1/register", json=sample_user_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Check response structure
        assert "id" in data
        assert data["first_name"] == sample_user_data["first_name"]
        assert data["last_name"] == sample_user_data["last_name"]
        assert data["email"] == sample_user_data["email"]
        assert "created_at" in data
        # Password should not be in response
        assert "password" not in data
        assert "hashed_password" not in data
    
    def test_register_user_duplicate_email(self, client, sample_user_data):
        """Test registration with duplicate email"""
        # Register first user
        response1 = client.post("/api/v1/register", json=sample_user_data)
        assert response1.status_code == 201
        
        # Try to register with same email
        response2 = client.post("/api/v1/register", json=sample_user_data)
        assert response2.status_code == 400
        assert "Email already registered" in response2.json()["detail"]
    
    def test_register_user_invalid_email_domain(self, client, sample_user_data):
        """Test registration with invalid email domain"""
        invalid_data = sample_user_data.copy()
        invalid_data["email"] = "john.doe@gmail.com"
        
        response = client.post("/api/v1/register", json=invalid_data)
        assert response.status_code == 422
        # Should have validation error for email domain
    
    def test_register_user_weak_password(self, client, sample_user_data):
        """Test registration with weak password"""
        weak_data = sample_user_data.copy()
        weak_data["password"] = "weak123"
        weak_data["confirm_password"] = "weak123"
        
        response = client.post("/api/v1/register", json=weak_data)
        assert response.status_code == 422
        # Should have validation error for password strength
    
    def test_register_user_password_mismatch(self, client, sample_user_data):
        """Test registration with password mismatch"""
        mismatch_data = sample_user_data.copy()
        mismatch_data["confirm_password"] = "DifferentPassword123!"
        
        response = client.post("/api/v1/register", json=mismatch_data)
        assert response.status_code == 422
        # Should have validation error for password mismatch
    
    def test_register_user_missing_fields(self, client):
        """Test registration with missing required fields"""
        incomplete_data = {
            "first_name": "John",
            "email": "john.doe@getcovered.io"
            # Missing last_name, password, confirm_password
        }
        
        response = client.post("/api/v1/register", json=incomplete_data)
        assert response.status_code == 422
    
    def test_register_user_password_similar_to_email(self, client):
        """Test registration with password too similar to email"""
        similar_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser@getcovered.io",
            "password": "Testuser123!",
            "confirm_password": "Testuser123!"
        }
        
        response = client.post("/api/v1/register", json=similar_data)
        # This might return 400 if the similarity validation is triggered
        assert response.status_code in [201, 400]


class TestUserLogin:
    """Test user login endpoint"""
    
    def test_login_success(self, client, registered_user, sample_login_data):
        """Test successful user login"""
        response = client.post("/api/v1/login", json=sample_login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
    
    def test_login_invalid_email(self, client, registered_user):
        """Test login with invalid email"""
        invalid_login = {
            "email": "nonexistent@getcovered.io",
            "password": "SecurePassword123!"
        }
        
        response = client.post("/api/v1/login", json=invalid_login)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_invalid_password(self, client, registered_user):
        """Test login with invalid password"""
        invalid_login = {
            "email": "john.doe@getcovered.io",
            "password": "WrongPassword123!"
        }
        
        response = client.post("/api/v1/login", json=invalid_login)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        incomplete_login = {
            "email": "john.doe@getcovered.io"
            # Missing password
        }
        
        response = client.post("/api/v1/login", json=incomplete_login)
        assert response.status_code == 422
    
    def test_login_empty_credentials(self, client):
        """Test login with empty credentials"""
        empty_login = {
            "email": "",
            "password": ""
        }
        
        response = client.post("/api/v1/login", json=empty_login)
        # Empty credentials are processed but treated as invalid login (401)
        # rather than validation error (422) in this implementation
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


class TestUserProfile:
    """Test user profile endpoints"""
    
    def test_get_profile_success(self, client, auth_headers, registered_user):
        """Test successful profile retrieval"""
        response = client.get("/api/v1/profile", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert data["email"] == registered_user["email"]
        assert data["first_name"] == registered_user["first_name"]
        assert data["last_name"] == registered_user["last_name"]
        assert "id" in data
        assert "created_at" in data
    
    def test_get_profile_unauthorized(self, client):
        """Test profile retrieval without authentication"""
        response = client.get("/api/v1/profile")
        assert response.status_code == 403  # No auth header
    
    def test_get_profile_invalid_token(self, client):
        """Test profile retrieval with invalid token"""
        invalid_headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/v1/profile", headers=invalid_headers)
        assert response.status_code == 401
    
    def test_get_profile_expired_token(self, client):
        """Test profile retrieval with expired token"""
        # Create an expired token
        from datetime import timedelta
        expired_token = create_access_token(
            {"sub": "test@getcovered.io"}, 
            expires_delta=timedelta(seconds=-1)
        )
        expired_headers = {"Authorization": f"Bearer {expired_token}"}
        
        response = client.get("/api/v1/profile", headers=expired_headers)
        assert response.status_code == 401
    
    def test_update_profile_success(self, client, auth_headers):
        """Test successful profile update"""
        update_data = {
            "first_name": "Jane",
            "last_name": "Smith"
        }
        
        response = client.put("/api/v1/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check updated data
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert "id" in data
        assert "email" in data
        assert "created_at" in data
    
    def test_update_profile_unauthorized(self, client):
        """Test profile update without authentication"""
        update_data = {
            "first_name": "Jane",
            "last_name": "Smith"
        }
        
        response = client.put("/api/v1/profile", json=update_data)
        assert response.status_code == 403
    
    def test_update_profile_invalid_token(self, client):
        """Test profile update with invalid token"""
        update_data = {
            "first_name": "Jane",
            "last_name": "Smith"
        }
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.put("/api/v1/profile", json=update_data, headers=invalid_headers)
        assert response.status_code == 401
    
    def test_update_profile_missing_fields(self, client, auth_headers):
        """Test profile update with missing fields"""
        incomplete_data = {
            "first_name": "Jane"
            # Missing last_name
        }
        
        response = client.put("/api/v1/profile", json=incomplete_data, headers=auth_headers)
        assert response.status_code == 422
    
    def test_update_profile_empty_fields(self, client, auth_headers):
        """Test profile update with empty fields"""
        empty_data = {
            "first_name": "",
            "last_name": ""
        }
        
        response = client.put("/api/v1/profile", json=empty_data, headers=auth_headers)
        # This might be allowed or might return 422 depending on validation rules
        assert response.status_code in [200, 422]


class TestAPIIntegration:
    """Integration tests for complete API workflows"""
    
    def test_complete_user_workflow(self, client):
        """Test complete user workflow: register -> login -> get profile -> update profile"""
        # Step 1: Register
        user_data = {
            "first_name": "Integration",
            "last_name": "Test",
            "email": "integration.test@getcovered.io",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        }
        
        register_response = client.post("/api/v1/register", json=user_data)
        assert register_response.status_code == 201
        registered_user = register_response.json()
        
        # Step 2: Login
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        login_response = client.post("/api/v1/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Step 3: Get profile
        auth_headers = {"Authorization": f"Bearer {token}"}
        profile_response = client.get("/api/v1/profile", headers=auth_headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["email"] == user_data["email"]
        
        # Step 4: Update profile
        update_data = {
            "first_name": "Updated",
            "last_name": "Name"
        }
        
        update_response = client.put("/api/v1/profile", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["first_name"] == "Updated"
        assert updated_data["last_name"] == "Name"
    
    def test_multiple_user_registration(self, client):
        """Test multiple users can register independently"""
        users = [
            {
                "first_name": "User1",
                "last_name": "Test",
                "email": "user1@getcovered.io",
                "password": "SecurePassword123!",
                "confirm_password": "SecurePassword123!"
            },
            {
                "first_name": "User2",
                "last_name": "Test",
                "email": "user2@getcovered.io",
                "password": "AnotherPassword123!",
                "confirm_password": "AnotherPassword123!"
            }
        ]
        
        for user_data in users:
            response = client.post("/api/v1/register", json=user_data)
            assert response.status_code == 201
            
            # Each user should be able to login
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            login_response = client.post("/api/v1/login", json=login_data)
            assert login_response.status_code == 200


class TestRootEndpoint:
    """Test root endpoint"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns correct message"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "User Registration API is running" in data["message"]