import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  className = '', 
  variant = 'primary', 
  children, 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40",
    secondary: "bg-void-light border border-gray-700 text-gray-200 hover:bg-gray-800",
    danger: "bg-neon-red/10 text-neon-red border border-neon-red/50 hover:bg-neon-red/20",
    ghost: "bg-transparent text-gray-400 hover:text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; icon?: React.ReactNode }> = ({ 
  children, 
  className = '',
  title,
  icon
}) => {
  return (
    <div className={`bg-void-light/50 backdrop-blur-md border border-gray-800 rounded-xl p-5 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
          {icon && <span className="text-neon-blue">{icon}</span>}
          {title && <h3 className="text-lg font-bold text-gray-100 uppercase tracking-wide">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-gray-700' }) => (
  <span className={`text-xs px-2 py-1 rounded-md font-mono ${color} text-white`}>
    {children}
  </span>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue transition-colors ${props.className || ''}`}
  />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    {...props}
    className={`w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue transition-colors ${props.className || ''}`}
  />
);