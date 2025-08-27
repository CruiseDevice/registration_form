import {
  validateEmail,
  validatePasswordStrength,
  validateName,
  validatePasswordMatch,
} from '../validation';

describe('validateEmail', () => {
  it('returns error for empty email', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('returns error for invalid email format', () => {
    expect(validateEmail('invalid')).toBe('Please enter a valid email address');
    expect(validateEmail('invalid@')).toBe('Please enter a valid email address');
    expect(validateEmail('invalid@domain')).toBe('Please enter a valid email address');
    expect(validateEmail('@domain.com')).toBe('Please enter a valid email address');
    expect(validateEmail('user@')).toBe('Please enter a valid email address');
  });

  it('returns error for wrong domain', () => {
    expect(validateEmail('user@gmail.com')).toBe('Email must be from @getcovered.io domain');
    expect(validateEmail('user@yahoo.com')).toBe('Email must be from @getcovered.io domain');
    expect(validateEmail('user@company.com')).toBe('Email must be from @getcovered.io domain');
    expect(validateEmail('user@getcovered.com')).toBe('Email must be from @getcovered.io domain');
  });

  it('returns null for valid getcovered.io emails', () => {
    expect(validateEmail('user@getcovered.io')).toBeNull();
    expect(validateEmail('john.doe@getcovered.io')).toBeNull();
    expect(validateEmail('test123@getcovered.io')).toBeNull();
    expect(validateEmail('user+tag@getcovered.io')).toBeNull();
  });

  it('handles edge cases', () => {
    expect(validateEmail('   ')).toBe('Please enter a valid email address'); // whitespace only - fails regex test
    expect(validateEmail('user@GETCOVERED.IO')).toBe('Email must be from @getcovered.io domain'); // case sensitive
  });
});

describe('validateName', () => {
  it('returns error for empty name', () => {
    expect(validateName('', 'First name')).toBe('First name is required');
    expect(validateName('', 'Last name')).toBe('Last name is required');
  });

  it('returns error for whitespace-only name', () => {
    expect(validateName('   ', 'First name')).toBe('First name is required');
    expect(validateName('\t\n', 'Last name')).toBe('Last name is required');
  });

  it('returns error for name less than 2 characters', () => {
    expect(validateName('A', 'First name')).toBe('First name must be at least 2 characters long');
    expect(validateName('B', 'Last name')).toBe('Last name must be at least 2 characters long');
  });

  it('returns error for trimmed name less than 2 characters', () => {
    expect(validateName(' A ', 'First name')).toBe('First name must be at least 2 characters long');
  });

  it('returns null for valid names', () => {
    expect(validateName('John', 'First name')).toBeNull();
    expect(validateName('Doe', 'Last name')).toBeNull();
    expect(validateName('Al', 'First name')).toBeNull(); // minimum valid length
    expect(validateName('Jean-Claude', 'First name')).toBeNull();
    expect(validateName("O'Connor", 'Last name')).toBeNull();
  });

  it('handles names with leading/trailing spaces', () => {
    expect(validateName('  John  ', 'First name')).toBeNull();
    expect(validateName(' A ', 'First name')).toBe('First name must be at least 2 characters long');
  });
});

describe('validatePasswordMatch', () => {
  it('returns error for empty confirm password', () => {
    expect(validatePasswordMatch('password123', '')).toBe('Please confirm your password');
  });

  it('returns error for mismatched passwords', () => {
    expect(validatePasswordMatch('password123', 'password124')).toBe('Passwords do not match');
    expect(validatePasswordMatch('Password123', 'password123')).toBe('Passwords do not match');
    expect(validatePasswordMatch('password', 'PASSWORD')).toBe('Passwords do not match');
  });

  it('returns null for matching passwords', () => {
    expect(validatePasswordMatch('password123', 'password123')).toBeNull();
    expect(validatePasswordMatch('ComplexPass123!', 'ComplexPass123!')).toBeNull();
    // Note: empty confirmPassword returns error even if password is empty
    expect(validatePasswordMatch('password', 'password')).toBeNull();
  });

  it('is case sensitive', () => {
    expect(validatePasswordMatch('Password', 'password')).toBe('Passwords do not match');
    expect(validatePasswordMatch('PASSWORD', 'password')).toBe('Passwords do not match');
  });
});

describe('validatePasswordStrength', () => {
  it('validates password length requirement', () => {
    const result = validatePasswordStrength('short');
    expect(result.hasValidLength).toBe(false);
    expect(result.feedback).toContain('Must be at least 12 characters long');
    
    const validLength = validatePasswordStrength('12charpassword');
    expect(validLength.hasValidLength).toBe(true);
  });

  it('validates uppercase requirement', () => {
    const noUpper = validatePasswordStrength('lowercase123!');
    expect(noUpper.hasUpperCase).toBe(false);
    expect(noUpper.feedback).toContain('Must contain at least one uppercase letter');
    
    const hasUpper = validatePasswordStrength('Uppercase123!');
    expect(hasUpper.hasUpperCase).toBe(true);
  });

  it('validates lowercase requirement', () => {
    const noLower = validatePasswordStrength('UPPERCASE123!');
    expect(noLower.hasLowerCase).toBe(false);
    expect(noLower.feedback).toContain('Must contain at least one lowercase letter');
    
    const hasLower = validatePasswordStrength('UPPERCASElower123!');
    expect(hasLower.hasLowerCase).toBe(true);
  });

  it('validates number requirement', () => {
    const noNumber = validatePasswordStrength('PasswordNoNum!');
    expect(noNumber.hasNumber).toBe(false);
    expect(noNumber.feedback).toContain('Must contain at least one number');
    
    const hasNumber = validatePasswordStrength('Password123!');
    expect(hasNumber.hasNumber).toBe(true);
  });

  it('validates symbol requirement', () => {
    const noSymbol = validatePasswordStrength('Password123');
    expect(noSymbol.hasSymbol).toBe(false);
    expect(noSymbol.feedback).toContain('Must contain at least one symbol');
    
    const hasSymbol = validatePasswordStrength('Password123!');
    expect(hasSymbol.hasSymbol).toBe(true);
  });

  it('validates various symbols', () => {
    const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', "'", ':', '"', '\\', '|', ',', '.', '<', '>', '/', '?'];
    
    symbols.forEach(symbol => {
      const result = validatePasswordStrength(`Password123${symbol}`);
      expect(result.hasSymbol).toBe(true);
    });
  });

  it('validates no repeated characters rule', () => {
    const repeated = validatePasswordStrength('Passwordaaa123!');
    expect(repeated.noRepeatedChars).toBe(false);
    expect(repeated.feedback).toContain('Cannot contain 3 or more consecutive repeated characters');
    
    const noRepeated = validatePasswordStrength('Password123!');
    expect(noRepeated.noRepeatedChars).toBe(true);
  });

  it('detects various patterns of repeated characters', () => {
    expect(validatePasswordStrength('Pass111word!').noRepeatedChars).toBe(false);
    expect(validatePasswordStrength('Passssword123!').noRepeatedChars).toBe(false);
    expect(validatePasswordStrength('Password!!!123').noRepeatedChars).toBe(false);
    expect(validatePasswordStrength('PasswordAAA123!').noRepeatedChars).toBe(false);
    
    // These should pass (only 2 consecutive)
    expect(validatePasswordStrength('Password112!').noRepeatedChars).toBe(true);
    expect(validatePasswordStrength('Password!!3').noRepeatedChars).toBe(true);
  });

  it('validates email difference requirement when email provided', () => {
    const email = 'john.doe@getcovered.io';
    const similarPassword = validatePasswordStrength('john.doe123!', email);
    expect(similarPassword.emailDifferenceValid).toBe(false);
    expect(similarPassword.feedback).toContain('Must differ from email local part by at least 5 characters');
    
    const differentPassword = validatePasswordStrength('CompletelyDifferent123!', email);
    expect(differentPassword.emailDifferenceValid).toBe(true);
  });

  it('skips email difference validation when no email provided', () => {
    const result = validatePasswordStrength('anypassword123!');
    expect(result.emailDifferenceValid).toBe(true);
    expect(result.feedback).not.toContain('Must differ from email local part by at least 5 characters');
  });

  it('calculates email difference correctly', () => {
    const email = 'test@getcovered.io';
    
    // Very similar to 'test' (less than 5 differences) - 'test123!A' vs 'test' has 6 chars different
    // Actually 'test123!A' (10 chars) vs 'test' (4 chars) = 6 different positions, so should be valid
    expect(validatePasswordStrength('test1', email).emailDifferenceValid).toBe(false); // 'test1' vs 'test' = 1 difference
    
    // Different enough (5+ differences)
    expect(validatePasswordStrength('different123!A', email).emailDifferenceValid).toBe(true);
  });

  it('handles case insensitive email comparison', () => {
    const email = 'Test@getcovered.io';
    const password = 'test'; // exactly same as email local part when lowercased
    
    const result = validatePasswordStrength(password, email);
    expect(result.emailDifferenceValid).toBe(false);
  });

  it('calculates correct score based on met criteria', () => {
    // Check what criteria 'weak' actually meets
    const weak = validatePasswordStrength('weak');
    // 'weak' has: hasLowerCase=true, noRepeatedChars=true, emailDifferenceValid=true = 3/7
    expect(weak.score).toBe(Math.round((3/7) * 100));
    
    // All criteria met
    const strong = validatePasswordStrength('StrongPassword123!', 'different@getcovered.io');
    expect(strong.score).toBe(100);
    
    // Partial criteria met - 'Password123' has: hasUpperCase, hasLowerCase, hasNumber, hasValidLength, noRepeatedChars = 5/7
    const partial = validatePasswordStrength('Password123'); // missing symbol
    expect(partial.score).toBe(Math.round((5/7) * 100)); // 71%
  });

  it('returns empty feedback for strong passwords', () => {
    const strong = validatePasswordStrength('StrongPassword123!', 'different@getcovered.io');
    expect(strong.feedback).toHaveLength(0);
    expect(strong.score).toBe(100);
  });

  it('accumulates multiple feedback messages for weak passwords', () => {
    const weak = validatePasswordStrength('weak');
    expect(weak.feedback.length).toBeGreaterThan(1);
    expect(weak.feedback).toContain('Must be at least 12 characters long');
    expect(weak.feedback).toContain('Must contain at least one uppercase letter');
    expect(weak.feedback).toContain('Must contain at least one number');
    expect(weak.feedback).toContain('Must contain at least one symbol');
  });

  it('handles edge cases', () => {
    // Empty password
    const empty = validatePasswordStrength('');
    expect(empty.score).toBe(Math.round((2/7) * 100)); // only noRepeatedChars and emailDifferenceValid
    expect(empty.feedback.length).toBeGreaterThan(0);
    
    // Very long password with all requirements
    const veryLong = validatePasswordStrength('A'.repeat(50) + 'b1!', 'different@getcovered.io');
    expect(veryLong.hasValidLength).toBe(true);
    expect(veryLong.hasUpperCase).toBe(true);
    expect(veryLong.hasLowerCase).toBe(true);
    expect(veryLong.hasNumber).toBe(true);
    expect(veryLong.hasSymbol).toBe(true);
  });

  it('returns consistent structure', () => {
    const result = validatePasswordStrength('TestPassword123!');
    
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('hasUpperCase');
    expect(result).toHaveProperty('hasLowerCase');
    expect(result).toHaveProperty('hasNumber');
    expect(result).toHaveProperty('hasSymbol');
    expect(result).toHaveProperty('hasValidLength');
    expect(result).toHaveProperty('noRepeatedChars');
    expect(result).toHaveProperty('emailDifferenceValid');
    
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.feedback)).toBe(true);
    expect(typeof result.hasUpperCase).toBe('boolean');
    expect(typeof result.hasLowerCase).toBe('boolean');
    expect(typeof result.hasNumber).toBe('boolean');
    expect(typeof result.hasSymbol).toBe('boolean');
    expect(typeof result.hasValidLength).toBe('boolean');
    expect(typeof result.noRepeatedChars).toBe('boolean');
    expect(typeof result.emailDifferenceValid).toBe('boolean');
  });
});