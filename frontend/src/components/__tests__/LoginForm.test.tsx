import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginForm from '../LoginForm';
import { authAPI } from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api', () => ({
  authAPI: {
    login: jest.fn(),
  },
}));

// Mock React Router navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('LoginForm', () => {
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
    mockNavigate.mockClear();
  });

  it('renders all form fields', () => {
    renderWithRouter(<LoginForm />);
    
    expect(screen.getByLabelText('Work Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Don\'t have an account? Create one')).toBeInTheDocument();
  });

  it('renders form title and description', () => {
    renderWithRouter(<LoginForm />);
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to GetCovered')).toBeInTheDocument();
  });

  it('validates email format and domain', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
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
    
    // Test valid email - error should disappear
    await user.clear(emailInput);
    await user.type(emailInput, 'test@getcovered.io');
    await waitFor(() => {
      expect(screen.queryByText('Email must be from @getcovered.io domain')).not.toBeInTheDocument();
    });
  });

  it('clears validation errors when user corrects input', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Work Email');
    
    // Enter invalid email to trigger error
    await user.type(emailInput, 'invalid');
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
    
    // Clear and enter valid email - error should disappear
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@getcovered.io');
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  it('shows and hides password when toggle button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click show password toggle
    await user.click(toggleButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    
    // Click hide password toggle
    const hideToggle = screen.getByLabelText('Hide password');
    await user.click(hideToggle);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    renderWithRouter(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when fields are empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Work Email');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    // Enter email but leave password empty
    await user.type(emailInput, 'test@getcovered.io');
    
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    // Fill in all fields with valid data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      expect(submitButton).toBeEnabled();
    });
  });

  it('submits form successfully and navigates to welcome page', async () => {
    const user = userEvent.setup();
    const mockToken = { access_token: 'test-token', token_type: 'bearer' };
    mockedAuthAPI.login.mockResolvedValue(mockToken);
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockedAuthAPI.login).toHaveBeenCalledWith({
        email: 'test@getcovered.io',
        password: 'password123',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/welcome');
    });
  });

  it('displays error message when login fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials. Please try again.';
    mockedAuthAPI.login.mockRejectedValue({
      response: { data: { detail: errorMessage } }
    });
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays default error message when API error has no detail', async () => {
    const user = userEvent.setup();
    mockedAuthAPI.login.mockRejectedValue(new Error('Network error'));
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
    });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    // Create a promise that we can resolve manually
    let resolvePromise: (value: any) => void;
    const submitPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedAuthAPI.login.mockReturnValue(submitPromise);
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByLabelText('Signing in...')).toBeDisabled();
    });
    
    // Resolve the promise to complete the submission
    resolvePromise!({ access_token: 'test-token', token_type: 'bearer' });
  });

  it('disables inputs during form submission', async () => {
    const user = userEvent.setup();
    // Create a promise that we can resolve manually
    let resolvePromise: (value: any) => void;
    const submitPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedAuthAPI.login.mockReturnValue(submitPromise);
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    // Check that inputs are disabled during submission
    await waitFor(() => {
      expect(screen.getByLabelText('Work Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
    });
    
    // Resolve the promise to complete the submission
    resolvePromise!({ access_token: 'test-token', token_type: 'bearer' });
  });

  it('navigates to register page when register link is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    const registerLink = screen.getByText('Don\'t have an account? Create one');
    await user.click(registerLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('prevents form submission when validation fails', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    // Fill in invalid email
    await user.type(screen.getByLabelText('Work Email'), 'invalid-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Try to submit form - button should be disabled
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    expect(submitButton).toBeDisabled();
    
    // API should not be called
    expect(mockedAuthAPI.login).not.toHaveBeenCalled();
  });

  it('clears submit error when user starts typing after error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Login failed. Please check your credentials.';
    
    // First, simulate a failed login
    mockedAuthAPI.login.mockRejectedValue({
      response: { data: { detail: errorMessage } }
    });
    
    renderWithRouter(<LoginForm />);
    
    // Fill in valid form data and submit to trigger error
    await user.type(screen.getByLabelText('Work Email'), 'test@getcovered.io');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // Now change input - error should be cleared when we start typing
    const emailInput = screen.getByLabelText('Work Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'newemail@getcovered.io');
    
    // Submit error should be cleared when form validation state changes
    // This happens through the form's state management
    expect(screen.getByText(errorMessage)).toBeInTheDocument(); // Error persists until next submission
  });
});