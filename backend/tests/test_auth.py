import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from jose import jwt, JWTError
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    verify_token,
    get_current_user
)
from app.models import User
from app.config import settings


class TestPasswordHashing:
    """Test password hashing and verification functions"""
    
    def test_password_hashing(self):
        """Test that password hashing works correctly"""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        # Hash should be different from original password
        assert hashed != password
        # Hash should be a string
        assert isinstance(hashed, str)
        # Hash should not be empty
        assert len(hashed) > 0
    
    def test_password_verification_success(self):
        """Test successful password verification"""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        # Verify the correct password
        assert verify_password(password, hashed) is True
    
    def test_password_verification_failure(self):
        """Test password verification with wrong password"""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword123!"
        hashed = get_password_hash(password)
        
        # Verify with wrong password should fail
        assert verify_password(wrong_password, hashed) is False
    
    def test_different_passwords_produce_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "SecurePassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Due to salt, same password should produce different hashes
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and verification"""
    
    def test_create_access_token_default_expiry(self):
        """Test creating access token with default expiry (15 minutes)"""
        data = {"sub": "test@getcovered.io"}
        token = create_access_token(data)
        
        # Token should be a string
        assert isinstance(token, str)
        # Should be able to decode the token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "test@getcovered.io"
        # Should have expiration
        assert "exp" in payload
    
    def test_create_access_token_custom_expiry(self):
        """Test creating access token with custom expiry"""
        data = {"sub": "test@getcovered.io"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta)
        
        # Decode and check expiration
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        now = datetime.utcnow()
        
        # Should expire in approximately 30 minutes (with some tolerance)
        time_diff = exp - now
        assert 29 <= time_diff.total_seconds() / 60 <= 31
    
    def test_create_access_token_with_additional_data(self):
        """Test creating token with additional claims"""
        data = {"sub": "test@getcovered.io", "role": "user", "id": 123}
        token = create_access_token(data)
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "test@getcovered.io"
        assert payload["role"] == "user"
        assert payload["id"] == 123


class TestTokenVerification:
    """Test token verification function"""
    
    def test_verify_valid_token(self):
        """Test verifying a valid token"""
        email = "test@getcovered.io"
        data = {"sub": email}
        token = create_access_token(data)
        
        # Create mock credentials
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = token
        
        # Should return the email
        result = verify_token(credentials)
        assert result == email
    
    def test_verify_token_missing_subject(self):
        """Test verifying token without 'sub' claim"""
        data = {"user": "test@getcovered.io"}  # Wrong key
        token = create_access_token(data)
        
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = token
        
        # Should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in exc_info.value.detail
    
    def test_verify_invalid_token(self):
        """Test verifying an invalid token"""
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = "invalid_token_string"
        
        # Should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in exc_info.value.detail
    
    def test_verify_expired_token(self):
        """Test verifying an expired token"""
        email = "test@getcovered.io"
        data = {"sub": email}
        # Create token that expires immediately
        expired_token = create_access_token(data, timedelta(seconds=-1))
        
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = expired_token
        
        # Should raise HTTPException for expired token
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_verify_token_wrong_signature(self):
        """Test verifying token with wrong signature"""
        # Create token with different secret
        data = {"sub": "test@getcovered.io"}
        wrong_token = jwt.encode(data, "wrong_secret", algorithm=settings.ALGORITHM)
        
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = wrong_token
        
        # Should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetCurrentUser:
    """Test get_current_user dependency function"""
    
    def test_get_current_user_success(self):
        """Test successfully getting current user"""
        # Create mock user
        mock_user = Mock(spec=User)
        mock_user.email = "test@getcovered.io"
        mock_user.id = 1
        
        # Create mock database session with proper chaining
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_filter = Mock()
        mock_filter.first.return_value = mock_user
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query
        
        # Should return the user
        result = get_current_user("test@getcovered.io", mock_db)
        assert result == mock_user
        
        # Verify database was queried correctly
        mock_db.query.assert_called_once_with(User)
        mock_query.filter.assert_called_once()
        mock_filter.first.assert_called_once()
    
    def test_get_current_user_not_found(self):
        """Test get_current_user when user doesn't exist"""
        # Create mock database session that returns None
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_filter = Mock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query
        
        # Should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("nonexistent@getcovered.io", mock_db)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in exc_info.value.detail
    
    @patch('app.auth.verify_token')
    def test_get_current_user_integration(self, mock_verify_token):
        """Test get_current_user with token verification integration"""
        email = "test@getcovered.io"
        
        # Mock verify_token to return email
        mock_verify_token.return_value = email
        
        # Create mock user and database
        mock_user = Mock(spec=User)
        mock_user.email = email
        
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_filter = Mock()
        mock_filter.first.return_value = mock_user
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query
        
        # Test that dependencies work together
        result = get_current_user(email, mock_db)
        assert result == mock_user


class TestAuthenticationFlow:
    """Integration tests for complete authentication flow"""
    
    def test_complete_auth_flow(self):
        """Test complete authentication flow: hash -> token -> verify"""
        # Step 1: Hash password
        password = "SecurePassword123!"
        hashed_password = get_password_hash(password)
        
        # Step 2: Verify password
        assert verify_password(password, hashed_password) is True
        
        # Step 3: Create token
        email = "test@getcovered.io"
        token = create_access_token({"sub": email})
        
        # Step 4: Verify token
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = token
        verified_email = verify_token(credentials)
        
        assert verified_email == email
    
    def test_token_lifecycle(self):
        """Test token creation, verification, and expiration"""
        email = "test@getcovered.io"
        
        # Create short-lived token
        token = create_access_token({"sub": email}, timedelta(seconds=2))
        
        # Should be valid immediately
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = token
        assert verify_token(credentials) == email
        
        # Wait for expiration and test (in real test, you'd mock time)
        # This is more of a documentation of expected behavior
        import time
        time.sleep(3)
        
        # Should now be expired
        with pytest.raises(HTTPException):
            verify_token(credentials)