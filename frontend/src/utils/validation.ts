import { PasswordStrength } from '../types/auth';

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return 'Email is required';
  }
  
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  if (!email.endsWith('@getcovered.io')) {
    return 'Email must be from @getcovered.io domain';
  }
  
  return null;
};

export const validatePasswordStrength = (password: string, email: string = ''): PasswordStrength => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const hasValidLength = password.length >= 12;
  
  // Check for repeated characters (3+ consecutive)
  let noRepeatedChars = true;
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      noRepeatedChars = false;
      break;
    }
  }
  
  // Check email difference
  let emailDifferenceValid = true;
  if (email) {
    const emailLocal = email.split('@')[0].toLowerCase();
    const passwordLower = password.toLowerCase();
    
    let differences = 0;
    const maxLength = Math.max(emailLocal.length, passwordLower.length);
    
    for (let i = 0; i < maxLength; i++) {
      const emailChar = emailLocal[i] || '';
      const passChar = passwordLower[i] || '';
      if (emailChar !== passChar) {
        differences++;
      }
    }
    
    emailDifferenceValid = differences >= 5;
  }
  
  const feedback: string[] = [];
  if (!hasValidLength) feedback.push('Must be at least 12 characters long');
  if (!hasUpperCase) feedback.push('Must contain at least one uppercase letter');
  if (!hasLowerCase) feedback.push('Must contain at least one lowercase letter');
  if (!hasNumber) feedback.push('Must contain at least one number');
  if (!hasSymbol) feedback.push('Must contain at least one symbol');
  if (!noRepeatedChars) feedback.push('Cannot contain 3 or more consecutive repeated characters');
  if (!emailDifferenceValid && email) feedback.push('Must differ from email local part by at least 5 characters');
  
  const validCriteria = [hasUpperCase, hasLowerCase, hasNumber, hasSymbol, hasValidLength, noRepeatedChars, emailDifferenceValid].filter(Boolean).length;
  const score = Math.round((validCriteria / 7) * 100);
  
  return {
    score,
    feedback,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSymbol,
    hasValidLength,
    noRepeatedChars,
    emailDifferenceValid,
  };
};

export const validateName = (name: string, fieldName: string): string | null => {
  if (!name.trim()) {
    return `${fieldName} is required`;
  }
  
  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }
  
  return null;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return null;
};