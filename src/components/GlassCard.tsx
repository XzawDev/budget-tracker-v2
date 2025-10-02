import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`
      bg-white/10 backdrop-blur-lg 
      border border-white/20 
      rounded-2xl shadow-2xl
      ${className}
    `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
