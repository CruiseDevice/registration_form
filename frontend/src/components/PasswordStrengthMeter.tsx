import React from 'react';
import { PasswordStrength } from '../types/auth';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
  const getStrengthColor = (score: number): string => {
    if (score < 30) return 'bg-red-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number): string => {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 90) return 'Good';
    return 'Strong';
  };

  const criteriaChecks = [
    { met: strength.hasValidLength, text: 'At least 12 characters' },
    { met: strength.hasUpperCase, text: 'Uppercase letter' },
    { met: strength.hasLowerCase, text: 'Lowercase letter' },
    { met: strength.hasNumber, text: 'Number' },
    { met: strength.hasSymbol, text: 'Symbol' },
    { met: strength.noRepeatedChars, text: 'No repeated characters' },
    { met: strength.emailDifferenceValid, text: 'Different from email' },
  ];

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Password Strength: {getStrengthText(strength.score)}
        </span>
        <span className="text-sm text-gray-500">{strength.score}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
          style={{ width: `${strength.score}%` }}
          role="progressbar"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${strength.score}%`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
        {criteriaChecks.map((criteria, index) => (
          <div key={index} className="flex items-center">
            <span
              className={`inline-block w-4 h-4 mr-2 rounded-full text-center leading-4 text-white text-xs ${
                criteria.met ? 'bg-green-500' : 'bg-gray-300'
              }`}
              aria-label={criteria.met ? 'Met' : 'Not met'}
            >
              {criteria.met ? '✓' : '○'}
            </span>
            <span className={criteria.met ? 'text-green-700' : 'text-gray-500'}>
              {criteria.text}
            </span>
          </div>
        ))}
      </div>

      {strength.feedback.length > 0 && (
        <div className="mt-2 text-sm text-red-600">
          <ul className="list-disc list-inside">
            {strength.feedback.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;