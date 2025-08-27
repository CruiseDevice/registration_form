import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RegistrationForm from '../RegistrationForm';
import { authAPI } from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api', () => ({
  authAPI: {
    register: jest.fn(),
  },
}));

// Mock React Router navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the PasswordStrengthMeter component
jest.mock('../PasswordStrengthMeter', () => {
  return function MockPasswordStrengthMeter({ strength }: { strength: any }) {
    return <div data-testid="password-strength-meter">Score: {strength.score}</div>;
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('RegistrationForm', () => {
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders all form fields', () => {
    renderWithRouter(<RegistrationForm />);
    
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Work Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders login link', () => {
    renderWithRouter(<RegistrationForm />);
    
    expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    // Focus and blur first name field to trigger validation
    const firstNameInput = screen.getByLabelText('First Name');
    await user.click(firstNameInput);
    await user.tab();
    
    // The validation happens on change, so let's type and clear
    await user.type(firstNameInput, 'a');
    await user.clear(firstNameInput);
    
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
  });

  it('validates email format and domain', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText('Work Email');
    
    // Test invalid email format
    await user.type(emailInput, 'invalid-email');
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
    
    // Clear and test wrong domain
    await user.clear(emailInput);
    await user.type(emailInput, 'test@gmail.com');
    await waitFor(() => {
      expect(screen.getByText('Email must be from @getcovered.io domain')).toBeInTheDocument();
    });
    
    // Test valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'test@getcovered.io');
    await waitFor(() => {
      expect(screen.queryByText('Email must be from @getcovered.io domain')).not.toBeInTheDocument();
    });
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    
    // Test weak password
    await user.type(passwordInput, 'weak');
    await waitFor(() => {
      expect(screen.getByText(/Must be at least 12 characters long/)).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    await user.type(passwordInput, 'TestPassword123!');
    await user.type(confirmPasswordInput, 'DifferentPassword123!');
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    
    // Test matching passwords
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, 'TestPassword123!');
    
    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });
  });

  it('shows and hides password fields when toggle buttons are clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    // Initially password fields should be of type 'password'
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    // Get all show password toggles and click the first one (password field)
    const passwordToggles = screen.getAllByLabelText('Show password');
    expect(passwordToggles).toHaveLength(2);
    
    await user.click(passwordToggles[0]); // First toggle is for password field
    
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password'); // Confirm password should still be hidden
    
    // Click hide password toggle for password field
    const hidePasswordToggle = screen.getByLabelText('Hide password');
    await user.click(hidePasswordToggle);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Test confirm password toggle
    await user.click(passwordToggles[1]); // Second toggle is for confirm password field
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('disables submit button when form is invalid', () => {
    renderWithRouter(<RegistrationForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Create account' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    // Fill in all fields with valid data
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Work Email'), 'john.doe@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!@#');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPassword123!@#');
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create account' });
      expect(submitButton).toBeEnabled();
    });
  });

  it('submits form successfully and navigates to login', async () => {
    const user = userEvent.setup();
    const mockUser = { id: 1, email: 'john.doe@getcovered.io', first_name: 'John', last_name: 'Doe', created_at: '2023-01-01T00:00:00Z' };
    mockedAuthAPI.register.mockResolvedValue(mockUser);
    
    renderWithRouter(<RegistrationForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Work Email'), 'john.doe@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!@#');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPassword123!@#');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create account' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockedAuthAPI.register).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@getcovered.io',
        password: 'StrongPassword123!@#',
        confirm_password: 'StrongPassword123!@#',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('displays error message when registration fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Registration failed. Email already exists.';
    mockedAuthAPI.register.mockRejectedValue({
      response: { data: { detail: errorMessage } }
    });
    
    renderWithRouter(<RegistrationForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Work Email'), 'john.doe@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!@#');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPassword123!@#');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create account' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    // Create a promise that we can resolve manually
    let resolvePromise: (value: any) => void;
    const submitPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedAuthAPI.register.mockReturnValue(submitPromise);
    
    renderWithRouter(<RegistrationForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Work Email'), 'john.doe@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!@#');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPassword123!@#');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create account' });
    await user.click(submitButton);
    
    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
      expect(screen.getByLabelText('Creating account...')).toBeDisabled();
    });
    
    // Resolve the promise to complete the submission
    resolvePromise!({ id: 1, email: 'john.doe@getcovered.io', first_name: 'John', last_name: 'Doe', created_at: '2023-01-01T00:00:00Z' });
  });

  it('navigates to login when login link is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const loginLink = screen.getByText('Already have an account? Sign in');
    await user.click(loginLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows password strength meter when password is entered', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    
    // Initially no password strength meter
    expect(screen.queryByTestId('password-strength-meter')).not.toBeInTheDocument();
    
    // Enter password
    await user.type(passwordInput, 'test123');
    
    // Password strength meter should appear
    await waitFor(() => {
      expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
    });
  });
});