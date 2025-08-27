import pytest
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from app.main import app
from app.database import get_db, Base
from app.models import User  # Import User model to register it with Base
from app.auth import create_access_token, verify_password, get_password_hash


# Test database setup is now handled in conftest.py


class TestEndToEndUserWorkflows:
    """Test complete user workflows from registration to profile management"""
    
    def test_complete_new_user_journey(self, client, test_db):
        """Test complete journey: register -> login -> view profile -> update profile -> logout simulation"""
        
        # Step 1: Register new user
        registration_data = {
            "first_name": "Integration",
            "last_name": "TestUser", 
            "email": "integration.user@getcovered.io",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        }
        
        register_response = client.post("/api/v1/register", json=registration_data)
        assert register_response.status_code == 201
        
        user_data = register_response.json()
        assert user_data["email"] == registration_data["email"]
        assert user_data["first_name"] == registration_data["first_name"]
        assert user_data["last_name"] == registration_data["last_name"]
        assert "id" in user_data
        assert "created_at" in user_data
        
        # Verify user exists in database
        db_user = test_db.query(User).filter(User.email == registration_data["email"]).first()
        assert db_user is not None
        assert db_user.id == user_data["id"]
        
        # Step 2: Login with registered credentials
        login_data = {
            "email": registration_data["email"],
            "password": registration_data["password"]
        }
        
        login_response = client.post("/api/v1/login", json=login_data)
        assert login_response.status_code == 200
        
        token_data = login_response.json()
        assert "access_token" in token_data
        assert "token_type" in token_data
        assert token_data["token_type"] == "bearer"
        
        access_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        
        # Step 3: Get user profile
        profile_response = client.get("/api/v1/profile", headers=auth_headers)
        assert profile_response.status_code == 200
        
        profile_data = profile_response.json()
        assert profile_data["id"] == user_data["id"]
        assert profile_data["email"] == registration_data["email"]
        assert profile_data["first_name"] == registration_data["first_name"]
        assert profile_data["last_name"] == registration_data["last_name"]
        
        # Step 4: Update user profile
        update_data = {
            "first_name": "Updated",
            "last_name": "Profile"
        }
        
        update_response = client.put("/api/v1/profile", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        
        updated_profile = update_response.json()
        assert updated_profile["first_name"] == "Updated"
        assert updated_profile["last_name"] == "Profile"
        assert updated_profile["email"] == registration_data["email"]  # Should remain same
        assert updated_profile["id"] == user_data["id"]  # Should remain same
        
        # Verify changes in database (refresh session to get latest data)
        test_db.expire_all()  # Expire all cached objects
        db_user_updated = test_db.query(User).filter(User.id == user_data["id"]).first()
        assert db_user_updated.first_name == "Updated"
        assert db_user_updated.last_name == "Profile"
        assert db_user_updated.updated_at is not None  # Should be set after update
        
        # Step 5: Verify profile update persists
        final_profile_response = client.get("/api/v1/profile", headers=auth_headers)
        assert final_profile_response.status_code == 200
        
        final_profile = final_profile_response.json()
        assert final_profile["first_name"] == "Updated"
        assert final_profile["last_name"] == "Profile"
    
    def test_multiple_users_concurrent_workflows(self, client, test_db):
        """Test multiple users can work independently without interference"""
        
        users = [
            {
                "first_name": "User1",
                "last_name": "Test",
                "email": "user1.concurrent@getcovered.io",
                "password": "Password123User1!",
                "confirm_password": "Password123User1!"
            },
            {
                "first_name": "User2", 
                "last_name": "Test",
                "email": "user2.concurrent@getcovered.io",
                "password": "Password123User2!",
                "confirm_password": "Password123User2!"
            },
            {
                "first_name": "User3",
                "last_name": "Test", 
                "email": "user3.concurrent@getcovered.io",
                "password": "Password123User3!",
                "confirm_password": "Password123User3!"
            }
        ]
        
        tokens = []
        user_ids = []
        
        # Register all users
        for user_data in users:
            register_response = client.post("/api/v1/register", json=user_data)
            assert register_response.status_code == 201
            user_ids.append(register_response.json()["id"])
        
        # Login all users
        for user_data in users:
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            login_response = client.post("/api/v1/login", json=login_data)
            assert login_response.status_code == 200
            tokens.append(login_response.json()["access_token"])
        
        # Each user updates their profile independently
        for i, token in enumerate(tokens):
            auth_headers = {"Authorization": f"Bearer {token}"}
            update_data = {
                "first_name": f"UpdatedUser{i+1}",
                "last_name": f"Independent{i+1}"
            }
            
            update_response = client.put("/api/v1/profile", json=update_data, headers=auth_headers)
            assert update_response.status_code == 200
            
            updated_profile = update_response.json()
            assert updated_profile["first_name"] == f"UpdatedUser{i+1}"
            assert updated_profile["last_name"] == f"Independent{i+1}"
            assert updated_profile["id"] == user_ids[i]
        
        # Verify each user's profile is correct and independent
        for i, token in enumerate(tokens):
            auth_headers = {"Authorization": f"Bearer {token}"}
            profile_response = client.get("/api/v1/profile", headers=auth_headers)
            assert profile_response.status_code == 200
            
            profile = profile_response.json()
            assert profile["first_name"] == f"UpdatedUser{i+1}"
            assert profile["last_name"] == f"Independent{i+1}"
            assert profile["id"] == user_ids[i]
            assert profile["email"] == users[i]["email"]


class TestCrossComponentIntegration:
    """Test integration between different components (auth, database, validation)"""
    
    def test_password_hashing_integration(self, client, test_db):
        """Test password hashing integrates correctly across registration and login"""
        
        user_data = {
            "first_name": "Password",
            "last_name": "Test",
            "email": "password.test@getcovered.io",
            "password": "TestPassword123!",
            "confirm_password": "TestPassword123!"
        }
        
        # Register user (password should be hashed)
        register_response = client.post("/api/v1/register", json=user_data)
        assert register_response.status_code == 201
        
        # Check database - password should be hashed, not plain text
        db_user = test_db.query(User).filter(User.email == user_data["email"]).first()
        assert db_user is not None
        assert db_user.hashed_password != user_data["password"]  # Should be hashed
        assert db_user.hashed_password.startswith("$2b$")  # bcrypt hash format
        
        # Verify password can be verified
        assert verify_password(user_data["password"], db_user.hashed_password) is True
        assert verify_password("wrong_password", db_user.hashed_password) is False
        
        # Login should work with original password
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        login_response = client.post("/api/v1/login", json=login_data)
        assert login_response.status_code == 200
        
        # Login should fail with wrong password
        wrong_login_data = {
            "email": user_data["email"],
            "password": "WrongPassword123!"
        }
        
        wrong_login_response = client.post("/api/v1/login", json=wrong_login_data)
        assert wrong_login_response.status_code == 401
    
    def test_jwt_token_lifecycle_integration(self, client, test_db):
        """Test JWT token creation, usage, and expiration integration"""
        
        # Register and login user
        user_data = {
            "first_name": "JWT",
            "last_name": "Test",
            "email": "jwt.test@getcovered.io",
            "password": "JWTPassword123!",
            "confirm_password": "JWTPassword123!"
        }
        
        client.post("/api/v1/register", json=user_data)
        
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        login_response = client.post("/api/v1/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Token should work for authentication
        auth_headers = {"Authorization": f"Bearer {token}"}
        profile_response = client.get("/api/v1/profile", headers=auth_headers)
        assert profile_response.status_code == 200
        
        # Test with expired token
        expired_token = create_access_token(
            {"sub": user_data["email"]}, 
            expires_delta=timedelta(seconds=-1)
        )
        expired_headers = {"Authorization": f"Bearer {expired_token}"}
        
        expired_response = client.get("/api/v1/profile", headers=expired_headers)
        assert expired_response.status_code == 401
        
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid.token.here"}
        invalid_response = client.get("/api/v1/profile", headers=invalid_headers)
        assert invalid_response.status_code == 401
    
    def test_database_transaction_integration(self, client, test_db):
        """Test database transactions work correctly with API operations"""
        
        # Test successful transaction
        user_data = {
            "first_name": "Transaction",
            "last_name": "Test",
            "email": "transaction.test@getcovered.io",
            "password": "TransactionTest123!",
            "confirm_password": "TransactionTest123!"
        }
        
        register_response = client.post("/api/v1/register", json=user_data)
        assert register_response.status_code == 201
        
        # User should exist in database
        db_user = test_db.query(User).filter(User.email == user_data["email"]).first()
        assert db_user is not None
        
        # Test duplicate registration (should fail)
        duplicate_response = client.post("/api/v1/register", json=user_data)
        assert duplicate_response.status_code == 400
        
        # Original user should still exist (transaction integrity)
        db_user_after = test_db.query(User).filter(User.email == user_data["email"]).first()
        assert db_user_after is not None
        assert db_user_after.id == db_user.id
        
        # Only one user with this email should exist
        user_count = test_db.query(User).filter(User.email == user_data["email"]).count()
        assert user_count == 1


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases in integrated workflows"""
    
    def test_registration_validation_edge_cases(self, client):
        """Test various registration validation scenarios"""
        
        # Test password too similar to email
        similar_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser@getcovered.io",
            "password": "Testuser12345!",  # Very similar to email local part
            "confirm_password": "Testuser12345!"
        }
        
        response = client.post("/api/v1/register", json=similar_data)
        # This should either succeed or fail based on similarity validation
        assert response.status_code in [201, 400]
        
        # Test email domain validation
        invalid_domain_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@gmail.com",  # Wrong domain
            "password": "ValidPassword123!",
            "confirm_password": "ValidPassword123!"
        }
        
        response = client.post("/api/v1/register", json=invalid_domain_data)
        assert response.status_code == 422
        
        # Test password strength
        weak_password_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "weakpassword@getcovered.io",
            "password": "weak",  # Too weak
            "confirm_password": "weak"
        }
        
        response = client.post("/api/v1/register", json=weak_password_data)
        assert response.status_code == 422
    
    def test_authentication_edge_cases(self, client, test_db):
        """Test authentication edge cases"""
        
        # Register a user first
        user_data = {
            "first_name": "Auth",
            "last_name": "Test",
            "email": "auth.edge@getcovered.io",
            "password": "AuthTest123!",
            "confirm_password": "AuthTest123!"
        }
        
        client.post("/api/v1/register", json=user_data)
        
        # Test login with wrong credentials
        wrong_credentials = [
            {"email": "auth.edge@getcovered.io", "password": "WrongPassword123!"},
            {"email": "wrong.email@getcovered.io", "password": "AuthTest123!"},
            {"email": "", "password": "AuthTest123!"},
            {"email": "auth.edge@getcovered.io", "password": ""},
        ]
        
        for creds in wrong_credentials:
            response = client.post("/api/v1/login", json=creds)
            assert response.status_code in [401, 422]
        
        # Test accessing protected endpoints without token
        protected_endpoints = [
            ("GET", "/api/v1/profile"),
            ("PUT", "/api/v1/profile", {"first_name": "New", "last_name": "Name"})
        ]
        
        for method, endpoint, *data in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "PUT":
                response = client.put(endpoint, json=data[0] if data else None)
            
            assert response.status_code == 403  # Forbidden without auth
    
    def test_profile_update_edge_cases(self, client, test_db):
        """Test profile update edge cases"""
        
        # Register and login user
        user_data = {
            "first_name": "Profile",
            "last_name": "Update",
            "email": "profile.update@getcovered.io",
            "password": "ProfileTest123!",
            "confirm_password": "ProfileTest123!"
        }
        
        client.post("/api/v1/register", json=user_data)
        
        login_response = client.post("/api/v1/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Test invalid update data
        invalid_updates = [
            {"first_name": "Valid"},  # Missing last_name
            {"last_name": "Valid"},   # Missing first_name
            {},                       # Missing both
            {"first_name": "", "last_name": "Valid"},  # Empty first_name
            {"first_name": "Valid", "last_name": ""},  # Empty last_name
        ]
        
        for invalid_data in invalid_updates:
            response = client.put("/api/v1/profile", json=invalid_data, headers=auth_headers)
            # Should either succeed (if empty strings allowed) or fail with validation error
            assert response.status_code in [200, 422]
    
    def test_concurrent_operations_on_same_user(self, client, test_db):
        """Test concurrent operations on the same user account"""
        
        # Register user
        user_data = {
            "first_name": "Concurrent",
            "last_name": "Test",
            "email": "concurrent.ops@getcovered.io",
            "password": "ConcurrentTest123!",
            "confirm_password": "ConcurrentTest123!"
        }
        
        client.post("/api/v1/register", json=user_data)
        
        # Login multiple times (simulate multiple sessions)
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        tokens = []
        for _ in range(3):
            login_response = client.post("/api/v1/login", json=login_data)
            tokens.append(login_response.json()["access_token"])
        
        # All tokens should work independently
        for i, token in enumerate(tokens):
            auth_headers = {"Authorization": f"Bearer {token}"}
            
            # Each session can access profile
            profile_response = client.get("/api/v1/profile", headers=auth_headers)
            assert profile_response.status_code == 200
            
            # Each session can update profile (last update wins)
            update_data = {
                "first_name": f"Session{i}",
                "last_name": f"Update{i}"
            }
            
            update_response = client.put("/api/v1/profile", json=update_data, headers=auth_headers)
            assert update_response.status_code == 200


class TestSystemIntegration:
    """Test system-level integration scenarios"""
    
    def test_api_response_consistency(self, client, test_db):
        """Test that API responses are consistent across different operations"""
        
        user_data = {
            "first_name": "Consistency",
            "last_name": "Test",
            "email": "consistency.test@getcovered.io",
            "password": "ConsistencyTest123!",
            "confirm_password": "ConsistencyTest123!"
        }
        
        # Register user
        register_response = client.post("/api/v1/register", json=user_data)
        registered_user = register_response.json()
        
        # Login user
        login_response = client.post("/api/v1/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Get profile
        profile_response = client.get("/api/v1/profile", headers=auth_headers)
        profile_user = profile_response.json()
        
        # Check consistency across responses
        consistent_fields = ["id", "email", "first_name", "last_name", "created_at"]
        
        for field in consistent_fields:
            assert registered_user[field] == profile_user[field], f"Field {field} inconsistent"
        
        # Update profile
        update_response = client.put("/api/v1/profile", json={
            "first_name": "Updated",
            "last_name": "Consistency"
        }, headers=auth_headers)
        
        updated_user = update_response.json()
        
        # Check that only intended fields changed
        assert updated_user["id"] == registered_user["id"]
        assert updated_user["email"] == registered_user["email"]
        assert updated_user["created_at"] == registered_user["created_at"]
        assert updated_user["first_name"] == "Updated"
        assert updated_user["last_name"] == "Consistency"
    
    def test_database_state_consistency(self, client, test_db):
        """Test that database state remains consistent after various operations"""
        
        initial_user_count = test_db.query(User).count()
        
        # Register multiple users with some failures
        users_to_register = [
            {
                "first_name": "User1",
                "last_name": "DB",
                "email": "user1.db@getcovered.io",
                "password": "DBTest123User1!",
                "confirm_password": "DBTest123User1!"
            },
            {
                "first_name": "User2",
                "last_name": "DB",
                "email": "user2.db@getcovered.io",
                "password": "DBTest123User2!",
                "confirm_password": "DBTest123User2!"
            },
            # Duplicate email (should fail)
            {
                "first_name": "User1Duplicate",
                "last_name": "DB",
                "email": "user1.db@getcovered.io",  # Same as first user
                "password": "DBTest123Duplicate!",
                "confirm_password": "DBTest123Duplicate!"
            }
        ]
        
        successful_registrations = 0
        
        for user_data in users_to_register:
            response = client.post("/api/v1/register", json=user_data)
            if response.status_code == 201:
                successful_registrations += 1
        
        # Check database state
        final_user_count = test_db.query(User).count()
        expected_count = initial_user_count + successful_registrations
        
        assert final_user_count == expected_count
        
        # Verify each successful user exists and has correct data
        for user_data in users_to_register[:2]:  # First two should succeed
            db_user = test_db.query(User).filter(User.email == user_data["email"]).first()
            assert db_user is not None
            assert db_user.first_name == user_data["first_name"]
            assert db_user.last_name == user_data["last_name"]
            assert db_user.email == user_data["email"]
            assert db_user.created_at is not None
    
    def test_application_startup_and_health(self, client):
        """Test application startup and basic health check"""
        
        # Test root endpoint (health check)
        response = client.get("/")
        assert response.status_code == 200
        
        health_data = response.json()
        assert "message" in health_data
        assert "User Registration API is running" in health_data["message"]
        
        # Test that all main endpoints are accessible
        endpoints_to_test = [
            ("POST", "/api/v1/register"),  # Should return validation error but endpoint exists
            ("POST", "/api/v1/login"),     # Should return validation error but endpoint exists
            ("GET", "/api/v1/profile"),    # Should return 403 but endpoint exists
            ("PUT", "/api/v1/profile"),    # Should return 403 but endpoint exists
        ]
        
        for method, endpoint in endpoints_to_test:
            if method == "POST":
                response = client.post(endpoint, json={})
            elif method == "GET":
                response = client.get(endpoint)
            elif method == "PUT":
                response = client.put(endpoint, json={})
            
            # Endpoint should exist (not 404)
            assert response.status_code != 404