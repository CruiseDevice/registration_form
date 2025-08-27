export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface UserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  first_name: string;
  last_name: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  hasValidLength: boolean;
  noRepeatedChars: boolean;
  emailDifferenceValid: boolean;
}