import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserLogin } from '../types/auth';
import { validateEmail } from '../utils/validation';
import { authAPI } from '../utils/api';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserLogin>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserLogin, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear previous error
    if (errors[name as keyof UserLogin]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Validate email on change
    if (name === 'email') {
      const error = validateEmail(value);
      if (error && value) {
        setErrors(prev => ({ ...prev, email: error }));
      }
    }
  };

  const isFormValid = () => {
    const hasNoErrors = Object.values(errors).every(error => !error);
    const allFieldsFilled = Object.values(formData).every(value => value.trim() !== '');
    
    return hasNoErrors && allFieldsFilled;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const tokenData = await authAPI.login(formData);
      localStorage.setItem('token', tokenData.access_token);
      navigate('/welcome');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (
    name: keyof UserLogin,
    label: string,
    type: string = 'text',
    placeholder?: string
  ) => {
    const hasError = !!errors[name];
    const hasValue = !!formData[name];

    return (
      <div className="mb-4">
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
        <div className="relative">
          <input
            type={name === 'password' && showPassword ? 'text' : type}
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            disabled={isSubmitting}
          />
          
          {name === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          )}
        </div>
        
        {hasError && (
          <p id={`${name}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back to GetCovered
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-200 rounded-sm sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {renderField('email', 'Work Email', 'email', 'your.name@getcovered.io')}
            {renderField('password', 'Password', 'password', 'Enter your password')}
            
            {submitError && (
              <div className="rounded-sm border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800" role="alert">{submitError}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={!isFormValid() || isSubmitting}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-sm text-white transition-colors ${
                  isFormValid() && !isSubmitting
                    ? 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                aria-label={isSubmitting ? 'Signing in...' : 'Sign in'}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                Don't have an account? Create one
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;