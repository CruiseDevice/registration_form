import React, { useState, useEffect } from 'react';
import { User, UserUpdate } from '../types/auth';
import { validateName } from '../utils/validation';
import { authAPI } from '../utils/api';

interface ProfilePageProps {
  onLogout: () => void;
  onBackToWelcome: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout, onBackToWelcome }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserUpdate>({
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserUpdate, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = await authAPI.getProfile();
        setUser(userData);
        setFormData({
          first_name: userData.first_name,
          last_name: userData.last_name,
        });
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Failed to load profile';
        setSubmitError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear previous error
    if (errors[name as keyof UserUpdate]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Validate field on change
    const fieldName = name === 'first_name' ? 'First name' : 'Last name';
    const error = validateName(value, fieldName);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const isFormValid = () => {
    const hasNoErrors = Object.values(errors).every(error => !error);
    const allFieldsFilled = Object.values(formData).every(value => value.trim() !== '');
    const hasChanges = user && (
      formData.first_name !== user.first_name || 
      formData.last_name !== user.last_name
    );
    
    return hasNoErrors && allFieldsFilled && hasChanges;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    
    try {
      const updatedUser = await authAPI.updateProfile(formData);
      setUser(updatedUser);
      setIsEditing(false);
      setSubmitSuccess('Profile updated successfully!');
      setTimeout(() => setSubmitSuccess(''), 3000);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Profile update failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
      });
    }
    setErrors({});
    setIsEditing(false);
    setSubmitError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const renderField = (
    name: keyof UserUpdate,
    label: string,
    placeholder?: string
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
            type="text"
            id={name}
            name={name}
            value={formData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={!isEditing || isSubmitting}
            className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              !isEditing ? 'bg-gray-50 text-gray-500' :
              hasError ? 'border-red-500 bg-red-50' : 
              isValid ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
          />
          
          {isEditing && isValid && (
            <div className="absolute inset-y-0 right-2 flex items-center">
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
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={onBackToWelcome}
                className="mr-4 text-gray-600 hover:text-primary-600 transition-colors"
                aria-label="Back to welcome page"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={onLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-sm text-sm font-medium transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl font-bold text-primary-600">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {submitSuccess && (
            <div className="mb-6 rounded-sm border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">{submitSuccess}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('first_name', 'First Name', 'Enter your first name')}
              {renderField('last_name', 'Last Name', 'Enter your last name')}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-500"
                aria-label="Email (read-only)"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Since
              </label>
              <input
                type="text"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-500"
                aria-label="Member since (read-only)"
              />
            </div>

            {submitError && (
              <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800" role="alert">{submitError}</p>
              </div>
            )}

            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-sm text-white transition-colors ${
                    isFormValid() && !isSubmitting
                      ? 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  aria-label={isSubmitting ? 'Updating profile...' : 'Save changes'}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;