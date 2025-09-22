import React from 'react';

/**
 * Eine wiederverwendbare Button-Komponente mit Tailwind-Styling.
 * @param {object} props - Alle Standard-Button-Props.
 */
export const Button = ({ children, className, ...props }) => {
  const baseClasses = 'bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors';
  return (
    <button
      {...props}
      className={`${baseClasses} ${className || ''}`}
    >
      {children}
    </button>
  );
};

export default Button;