
import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  description?: string;
  htmlFor?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, children, error, description, htmlFor }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={htmlFor} className="text-sm font-semibold text-gray-300 flex items-center">
      {label}
      {description && <span className="ml-2 text-xs font-normal text-gray-500">{description}</span>}
    </label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1 font-medium">{error}</p>}
  </div>
);

export default FormField;
