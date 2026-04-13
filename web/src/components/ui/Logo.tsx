import { clsx } from 'clsx';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span
      className={clsx(
        'font-bold tracking-tight select-none',
        sizes[size],
        className
      )}
    >
      <span className="text-primary-500">V</span>
      <span className="text-white">elona</span>
    </span>
  );
}
