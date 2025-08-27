import pytest
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.database import Base
from app.models import User


# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_models.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    """Create and clean up test database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_user_data():
    """Sample valid user data for testing"""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@getcovered.io",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # "secret"
    }


class TestUserModelCreation:
    """Test User model instance creation"""
    
    def test_create_user_instance(self, sample_user_data):
        """Test creating a User model instance"""
        user = User(**sample_user_data)
        
        # Check that instance is created correctly
        assert user.first_name == sample_user_data["first_name"]
        assert user.last_name == sample_user_data["last_name"]
        assert user.email == sample_user_data["email"]
        assert user.hashed_password == sample_user_data["hashed_password"]
        
        # ID should be None before saving to database
        assert user.id is None
        
        # Timestamps should be None before saving (set by database)
        assert user.created_at is None
        assert user.updated_at is None
    
    def test_create_user_with_minimal_data(self):
        """Test creating user with only required fields"""
        minimal_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@getcovered.io",
            "hashed_password": "hashed_password_here"
        }
        
        user = User(**minimal_data)
        
        assert user.first_name == "Jane"
        assert user.last_name == "Smith"
        assert user.email == "jane.smith@getcovered.io"
        assert user.hashed_password == "hashed_password_here"
    
    def test_user_string_representation(self, sample_user_data):
        """Test User model string representation"""
        user = User(**sample_user_data)
        
        # The default string representation should contain the class name
        str_repr = str(user)
        assert "User" in str_repr
    
    def test_user_model_attributes(self, sample_user_data):
        """Test that User model has all expected attributes"""
        user = User(**sample_user_data)
        
        # Check that all expected attributes exist
        expected_attributes = [
            'id', 'first_name', 'last_name', 'email', 
            'hashed_password', 'created_at', 'updated_at'
        ]
        
        for attr in expected_attributes:
            assert hasattr(user, attr), f"User model missing attribute: {attr}"


class TestUserModelDatabase:
    """Test User model database operations"""
    
    def test_save_user_to_database(self, test_db, sample_user_data):
        """Test saving user to database"""
        user = User(**sample_user_data)
        
        # Add and commit to database
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        # Check that user was saved and has ID
        assert user.id is not None
        assert isinstance(user.id, int)
        assert user.id > 0
        
        # Check that timestamps were set by database
        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)
        
        # updated_at should be None on creation (only set on update)
        assert user.updated_at is None
    
    def test_query_user_from_database(self, test_db, sample_user_data):
        """Test querying user from database"""
        # Create and save user
        user = User(**sample_user_data)
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        user_id = user.id
        
        # Query user back from database
        retrieved_user = test_db.query(User).filter(User.id == user_id).first()
        
        assert retrieved_user is not None
        assert retrieved_user.id == user_id
        assert retrieved_user.first_name == sample_user_data["first_name"]
        assert retrieved_user.last_name == sample_user_data["last_name"]
        assert retrieved_user.email == sample_user_data["email"]
        assert retrieved_user.hashed_password == sample_user_data["hashed_password"]
    
    def test_query_user_by_email(self, test_db, sample_user_data):
        """Test querying user by email (common use case)"""
        # Create and save user
        user = User(**sample_user_data)
        test_db.add(user)
        test_db.commit()
        
        # Query by email
        retrieved_user = test_db.query(User).filter(User.email == sample_user_data["email"]).first()
        
        assert retrieved_user is not None
        assert retrieved_user.email == sample_user_data["email"]
        assert retrieved_user.first_name == sample_user_data["first_name"]
    
    def test_update_user_in_database(self, test_db, sample_user_data):
        """Test updating user in database"""
        # Create and save user
        user = User(**sample_user_data)
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        original_created_at = user.created_at
        
        # Update user data
        user.first_name = "Updated"
        user.last_name = "Name"
        test_db.commit()
        test_db.refresh(user)
        
        # Check that data was updated
        assert user.first_name == "Updated"
        assert user.last_name == "Name"
        
        # Check that timestamps behave correctly
        assert user.created_at == original_created_at  # Should not change
        assert user.updated_at is not None  # Should be set on update
        assert isinstance(user.updated_at, datetime)
    
    def test_delete_user_from_database(self, test_db, sample_user_data):
        """Test deleting user from database"""
        # Create and save user
        user = User(**sample_user_data)
        test_db.add(user)
        test_db.commit()
        user_id = user.id
        
        # Delete user
        test_db.delete(user)
        test_db.commit()
        
        # Verify user is deleted
        deleted_user = test_db.query(User).filter(User.id == user_id).first()
        assert deleted_user is None
    
    def test_multiple_users_in_database(self, test_db):
        """Test storing multiple users in database"""
        users_data = [
            {
                "first_name": "User1",
                "last_name": "Test",
                "email": "user1@getcovered.io",
                "hashed_password": "password1"
            },
            {
                "first_name": "User2",
                "last_name": "Test",
                "email": "user2@getcovered.io",
                "hashed_password": "password2"
            },
            {
                "first_name": "User3",
                "last_name": "Test",
                "email": "user3@getcovered.io",
                "hashed_password": "password3"
            }
        ]
        
        # Create and save all users
        created_users = []
        for user_data in users_data:
            user = User(**user_data)
            test_db.add(user)
            created_users.append(user)
        
        test_db.commit()
        
        # Refresh all users to get IDs
        for user in created_users:
            test_db.refresh(user)
        
        # Query all users back
        all_users = test_db.query(User).all()
        
        assert len(all_users) == 3
        
        # Check that all users have unique IDs
        user_ids = [user.id for user in all_users]
        assert len(set(user_ids)) == 3  # All IDs should be unique


class TestUserModelConstraints:
    """Test User model database constraints"""
    
    def test_email_uniqueness_constraint(self, test_db, sample_user_data):
        """Test that email must be unique"""
        # Create first user
        user1 = User(**sample_user_data)
        test_db.add(user1)
        test_db.commit()
        
        # Try to create second user with same email
        user2_data = sample_user_data.copy()
        user2_data["first_name"] = "Different"
        user2_data["last_name"] = "User"
        
        user2 = User(**user2_data)
        test_db.add(user2)
        
        # Should raise IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            test_db.commit()
    
    def test_required_fields_not_null(self, test_db):
        """Test that required fields cannot be null"""
        # Test missing first_name
        with pytest.raises(IntegrityError):
            user = User(
                last_name="Doe",
                email="test1@getcovered.io",
                hashed_password="password"
            )
            test_db.add(user)
            test_db.commit()
        
        # Rollback the failed transaction
        test_db.rollback()
        
        # Test missing last_name
        with pytest.raises(IntegrityError):
            user = User(
                first_name="John",
                email="test2@getcovered.io",
                hashed_password="password"
            )
            test_db.add(user)
            test_db.commit()
        
        # Rollback the failed transaction
        test_db.rollback()
        
        # Test missing email
        with pytest.raises(IntegrityError):
            user = User(
                first_name="John",
                last_name="Doe",
                hashed_password="password"
            )
            test_db.add(user)
            test_db.commit()
        
        # Rollback the failed transaction
        test_db.rollback()
        
        # Test missing hashed_password
        with pytest.raises(IntegrityError):
            user = User(
                first_name="John",
                last_name="Doe",
                email="test3@getcovered.io"
            )
            test_db.add(user)
            test_db.commit()


class TestUserModelIndexes:
    """Test User model database indexes"""
    
    def test_email_index_exists(self, test_db):
        """Test that email field has database index"""
        # Check if index exists by examining database schema
        # This is SQLite-specific, but works for our test database
        result = test_db.execute(text("PRAGMA index_list(users)"))
        indexes = result.fetchall()
        
        # Should have at least one index (email or primary key)
        assert len(indexes) > 0
        
        # Check for email index specifically
        index_info = test_db.execute(text("PRAGMA index_info(ix_users_email)"))
        email_index = index_info.fetchall()
        
        # Should have index on email column
        assert len(email_index) > 0
    
    def test_primary_key_index(self, test_db):
        """Test that primary key index exists"""
        # Check table info for primary key
        result = test_db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()
        
        # Find the id column and check it's primary key
        id_column = next((col for col in columns if col[1] == 'id'), None)
        assert id_column is not None
        assert id_column[5] == 1  # pk column should be 1 for primary key


class TestUserModelTableStructure:
    """Test User model table structure"""
    
    def test_table_name(self):
        """Test that table name is correct"""
        assert User.__tablename__ == "users"
    
    def test_table_columns(self, test_db):
        """Test that table has all expected columns"""
        # Get table column information
        result = test_db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()
        
        # Extract column names
        column_names = [col[1] for col in columns]
        
        expected_columns = [
            'id', 'first_name', 'last_name', 'email', 
            'hashed_password', 'created_at', 'updated_at'
        ]
        
        for expected_col in expected_columns:
            assert expected_col in column_names, f"Missing column: {expected_col}"
    
    def test_column_types(self, test_db):
        """Test that columns have correct data types"""
        result = test_db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()
        
        # Create a mapping of column names to types
        column_types = {col[1]: col[2] for col in columns}
        
        # Check specific column types
        assert column_types['id'] == 'INTEGER'
        assert column_types['first_name'] == 'VARCHAR'
        assert column_types['last_name'] == 'VARCHAR'
        assert column_types['email'] == 'VARCHAR'
        assert column_types['hashed_password'] == 'VARCHAR'
        assert 'DATETIME' in column_types['created_at']
        assert 'DATETIME' in column_types['updated_at']
    
    def test_column_constraints(self, test_db):
        """Test that columns have correct constraints"""
        result = test_db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()
        
        # Create mapping of column names to not null constraint
        not_null_constraints = {col[1]: col[3] for col in columns}
        
        # Check not null constraints
        assert not_null_constraints['id'] == 1  # Primary key, not null
        assert not_null_constraints['first_name'] == 1  # Not null
        assert not_null_constraints['last_name'] == 1  # Not null
        assert not_null_constraints['email'] == 1  # Not null
        assert not_null_constraints['hashed_password'] == 1  # Not null
        # created_at and updated_at can be null initially