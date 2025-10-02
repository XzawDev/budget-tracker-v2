import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
}) => {
  const baseClasses =
    "px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95";

  const variantClasses = {
    primary:
      "bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 text-white",
    secondary:
      "bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/50 text-white",
    danger:
      "bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </button>
  );
};

export default Button;
