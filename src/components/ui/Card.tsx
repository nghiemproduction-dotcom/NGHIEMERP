interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Card({ className = '', children, onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
