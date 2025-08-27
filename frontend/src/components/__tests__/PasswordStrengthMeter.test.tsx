import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { PasswordStrength } from '../../types/auth';

describe('PasswordStrengthMeter', () => {
  const createMockStrength = (overrides: Partial<PasswordStrength> = {}): PasswordStrength => ({
    score: 0,
    feedback: [],
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSymbol: false,
    hasValidLength: false,
    noRepeatedChars: true,
    emailDifferenceValid: true,
    ...overrides,
  });

  it('renders password strength score and percentage', () => {
    const strength = createMockStrength({ score: 75 });
    
    render(<PasswordStrengthMeter strength={strength} />);
    
    expect(screen.getByText('Password Strength: Good')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays progress bar with correct width and aria attributes', () => {
    const strength = createMockStrength({ score: 60 });
    
    render(<PasswordStrengthMeter strength={strength} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Password strength: 60%');
    expect(progressBar).toHaveStyle({ width: '60%' });
  });

  describe('strength text and colors', () => {
    it('shows "Weak" with red color for score < 30', () => {
      const strength = createMockStrength({ score: 20 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Weak')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('shows "Fair" with yellow color for score 30-59', () => {
      const strength = createMockStrength({ score: 45 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Fair')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-yellow-500');
    });

    it('shows "Good" with blue color for score 60-89', () => {
      const strength = createMockStrength({ score: 75 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Good')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-blue-500');
    });

    it('shows "Strong" with green color for score >= 90', () => {
      const strength = createMockStrength({ score: 100 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Strong')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-green-500');
    });
  });

  describe('criteria checks', () => {
    it('displays all criteria with correct met/not met status', () => {
      const strength = createMockStrength({
        hasValidLength: true,
        hasUpperCase: true,
        hasLowerCase: false,
        hasNumber: false,
        hasSymbol: true,
        noRepeatedChars: true,
        emailDifferenceValid: false,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // Check that all criteria are displayed
      expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
      expect(screen.getByText('Uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('Lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('No repeated characters')).toBeInTheDocument();
      expect(screen.getByText('Different from email')).toBeInTheDocument();
    });

    it('shows green checkmarks for met criteria', () => {
      const strength = createMockStrength({
        hasValidLength: true,
        hasUpperCase: true,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // Find criteria that are met
      const metCriteria = screen.getAllByLabelText('Met');
      expect(metCriteria).toHaveLength(4); // hasValidLength, hasUpperCase, noRepeatedChars, emailDifferenceValid (default true)
      
      metCriteria.forEach(criteria => {
        expect(criteria).toHaveClass('bg-green-500');
        expect(criteria).toHaveTextContent('✓');
      });
    });

    it('shows gray circles for unmet criteria', () => {
      const strength = createMockStrength({
        hasLowerCase: false,
        hasNumber: false,
        hasSymbol: false,
        hasValidLength: false,
        hasUpperCase: false,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // Find criteria that are not met
      const unmetCriteria = screen.getAllByLabelText('Not met');
      expect(unmetCriteria).toHaveLength(5); // All false criteria
      
      unmetCriteria.forEach(criteria => {
        expect(criteria).toHaveClass('bg-gray-300');
        expect(criteria).toHaveTextContent('○');
      });
    });

    it('applies correct text colors for met and unmet criteria', () => {
      const strength = createMockStrength({
        hasValidLength: true,
        hasLowerCase: false,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // Check met criteria have green text
      const validLengthText = screen.getByText('At least 12 characters');
      expect(validLengthText).toHaveClass('text-green-700');
      
      // Check unmet criteria have gray text
      const lowercaseText = screen.getByText('Lowercase letter');
      expect(lowercaseText).toHaveClass('text-gray-500');
    });
  });

  describe('feedback messages', () => {
    it('displays feedback messages when present', () => {
      const strength = createMockStrength({
        feedback: [
          'Must be at least 12 characters long',
          'Must contain at least one uppercase letter',
          'Must contain at least one symbol'
        ]
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Must be at least 12 characters long')).toBeInTheDocument();
      expect(screen.getByText('Must contain at least one uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('Must contain at least one symbol')).toBeInTheDocument();
      
      // Check that feedback is displayed in a list format
      const feedbackList = screen.getByRole('list');
      expect(feedbackList).toBeInTheDocument();
      expect(feedbackList).toHaveClass('list-disc', 'list-inside');
    });

    it('does not display feedback section when feedback is empty', () => {
      const strength = createMockStrength({ feedback: [] });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // No feedback list should be present
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('displays feedback in red text', () => {
      const strength = createMockStrength({
        feedback: ['Must be at least 12 characters long']
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      const feedbackList = screen.getByRole('list');
      expect(feedbackList.parentElement).toHaveClass('text-red-600');
    });
  });

  describe('edge cases', () => {
    it('handles score of 0', () => {
      const strength = createMockStrength({ score: 0 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Weak')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '0%' });
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('handles score of 100', () => {
      const strength = createMockStrength({ 
        score: 100,
        hasValidLength: true,
        hasUpperCase: true,
        hasLowerCase: true,
        hasNumber: true,
        hasSymbol: true,
        noRepeatedChars: true,
        emailDifferenceValid: true,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      expect(screen.getByText('Password Strength: Strong')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '100%' });
      expect(progressBar).toHaveClass('bg-green-500');
      
      // All criteria should be met
      const metCriteria = screen.getAllByLabelText('Met');
      expect(metCriteria).toHaveLength(7);
    });

    it('handles boundary score values', () => {
      // Test score exactly at boundary (30)
      const strength30 = createMockStrength({ score: 30 });
      render(<PasswordStrengthMeter strength={strength30} />);
      expect(screen.getByText('Password Strength: Fair')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveClass('bg-yellow-500');
    });
  });

  describe('accessibility', () => {
    it('provides proper aria labels for criteria status', () => {
      const strength = createMockStrength({
        hasValidLength: true,
        hasLowerCase: false,
      });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      // Should have both "Met" and "Not met" aria labels
      expect(screen.getAllByLabelText('Met').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('Not met').length).toBeGreaterThan(0);
    });

    it('provides proper progress bar accessibility attributes', () => {
      const strength = createMockStrength({ score: 85 });
      
      render(<PasswordStrengthMeter strength={strength} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Password strength: 85%');
    });
  });
});