import React, { useState, useEffect } from 'react';
import { UserCreate } from '../types/auth';
import { validateEmail, validateName, validatePasswordMatch, validatePasswordStrength } from '../utils/validation';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { authAPI } from '../utils/api';

interface RegistrationFormProps {
  onSuccess: (user: any) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<UserCreate>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserCreate, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const passwordStrength = validatePasswordStrength(formData.password, formData.email);

  const validateField = (name: keyof UserCreate, value: string) => {
    switch (name) {
      case 'first_name':
        return validateName(value, 'First name');
      case 'last_name':
        return validateName(value, 'Last name');
      case 'email':
        return validateEmail(value);
      case 'password':
        const strength = validatePasswordStrength(value, formData.email);
        return strength.feedback.length > 0 ? strength.feedback.join(', ') : null;
      case 'confirm_password':
        return validatePasswordMatch(formData.password, value);
      default:
        return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear previous error
    if (errors[name as keyof UserCreate]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Validate field on change
    const error = validateField(name as keyof UserCreate, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
    
    // Also validate confirm password if password changes
    if (name === 'password' && formData.confirm_password) {
      const confirmError = validatePasswordMatch(value, formData.confirm_password);
      setErrors(prev => ({ ...prev, confirm_password: confirmError || undefined }));
    }
  };

  const isFormValid = () => {
    const hasNoErrors = Object.values(errors).every(error => !error);
    const allFieldsFilled = Object.values(formData).every(value => value.trim() !== '');
    const passwordIsStrong = passwordStrength.score === 100;
    
    return hasNoErrors && allFieldsFilled && passwordIsStrong;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const user = await authAPI.register(formData);
      onSuccess(user);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (
    name: keyof UserCreate,
    label: string,
    type: string = 'text',
    placeholder?: string,
    showToggle?: boolean
  ) => {
    const hasError = !!errors[name];
    const hasValue = !!formData[name];
    const isValid = hasValue && !hasError;

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
            type={showToggle && name === 'password' && showPassword ? 'text' : 
                  showToggle && name === 'confirm_password' && showConfirmPassword ? 'text' : type}
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 
              isValid ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            disabled={isSubmitting}
          />
          
          {showToggle && (
            <button
              type="button"
              onClick={() => {
                if (name === 'password') setShowPassword(!showPassword);
                if (name === 'confirm_password') setShowConfirmPassword(!showConfirmPassword);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              aria-label={`${(name === 'password' && showPassword) || (name === 'confirm_password' && showConfirmPassword) ? 'Hide' : 'Show'} password`}
            >
              {((name === 'password' && showPassword) || (name === 'confirm_password' && showConfirmPassword)) ? '🙈' : '👁️'}
            </button>
          )}
          
          {isValid && (
            <div className="absolute inset-y-0 right-8 flex items-center">
              <span className="text-green-500 text-sm" aria-label="Valid">✓</span>
            </div>
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join our team at GetCovered
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-200 rounded-sm sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {renderField('first_name', 'First Name', 'text', 'Enter your first name')}
            {renderField('last_name', 'Last Name', 'text', 'Enter your last name')}
            {renderField('email', 'Work Email', 'email', 'your.name@getcovered.io')}
            
            <div>
              {renderField('password', 'Password', 'password', 'Create a strong password', true)}
              {formData.password && (
                <PasswordStrengthMeter strength={passwordStrength} />
              )}
            </div>
            
            {renderField('confirm_password', 'Confirm Password', 'password', 'Confirm your password', true)}
            
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
                aria-label={isSubmitting ? 'Creating account...' : 'Create account'}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;