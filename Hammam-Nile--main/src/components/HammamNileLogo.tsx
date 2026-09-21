import React from 'react';

interface HammamNileLogoProps {
  className?: string;
  variant?: 'full' | 'emblem' | 'horizontal' | 'header';
  color?: string; // default royal blue #004CB7
  textColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const HammamNileEmblem: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = 'w-10 h-10', color = '#004CB7' }) => {
  return (
    <svg
      viewBox="0 0 160 110"
      className={className}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 
        Official Hammam Nile Bird / Wing Emblem:
        Royal Blue aerodynamic silhouette with backward speed feathers
      */}
      <path
        d="M 22 40 
           L 100 45 
           C 114 43 124 45 130 52 
           C 123 57 116 63 118 72 
           C 120 80 126 83 130 85 
           C 126 91 116 94 104 94 
           C 88 93 72 82 66 75 
           L 96 73 
           L 46 66 
           L 88 64 
           L 32 55 
           L 84 53 
           L 22 40 Z"
        display="none"
      />
      {/* Detailed layered paths reproducing the exact shape from the photo */}
      <g fill={color}>
        {/* Upper wing body and head */}
        <path
          d="M 24 43 
             C 45 46 72 50 96 50
             C 110 47 122 47 131 52
             C 122 56 116 64 117 72
             C 118 80 125 84 130 87
             C 124 93 114 96 102 95
             C 86 94 74 85 64 78
             C 74 79 86 78 96 76
             C 78 73 62 69 50 67
             C 65 67 78 66 90 64
             C 70 61 52 57 36 54
             C 52 54 68 53 82 52
             C 60 48 40 45 24 43 Z"
        />
        {/* Crisp speed-line cutouts & dynamic feathers */}
        <path
          d="M 20 42
             Q 60 48 98 48
             C 114 45 125 45 132 52
             C 123 58 116 65 118 74
             C 120 81 126 85 130 87
             C 122 93 112 96 98 95
             C 82 94 70 85 60 78
             L 88 77
             L 48 68
             L 82 66
             L 34 56
             L 76 54
             Z"
          opacity="0.95"
        />
      </g>
    </svg>
  );
};

export const HammamNileLogo: React.FC<HammamNileLogoProps> = ({
  className = '',
  variant = 'full',
  color = '#004CB7',
  textColor = '#004CB7',
  size = 'md',
}) => {
  const emblemSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    xs: 'text-base',
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  };

  if (variant === 'emblem') {
    return <HammamNileEmblem className={`${emblemSizes[size]} ${className}`} color={color} />;
  }

  if (variant === 'header' || variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 sm:gap-3.5 select-none ${className}`}>
        <div className="shrink-0 drop-shadow-xs">
          <HammamNileEmblem className={emblemSizes[size]} color={color} />
        </div>
        <div className="flex flex-col">
          <span
            className={`${textSizes[size]} font-normal leading-none tracking-tight`}
            style={{
              fontFamily: "'Alex Brush', 'Great Vibes', 'Playball', cursive",
              color: textColor,
            }}
          >
            Hammam Nile
          </span>
          <span
            className="text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.25em] opacity-75 mt-0.5"
            style={{ color: textColor }}
          >
            Hammam & Boutique
          </span>
        </div>
      </div>
    );
  }

  // Full stacked variant (as seen on the official photo)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Blue Wing / Bird Emblem */}
      <div className="mb-2 transition-transform duration-200 hover:scale-105">
        <HammamNileEmblem className={emblemSizes[size]} color={color} />
      </div>

      {/* Cursive Calligraphy 'Hammam Nile' */}
      <h1
        className={`${textSizes[size]} font-normal leading-tight tracking-normal my-0`}
        style={{
          fontFamily: "'Alex Brush', 'Great Vibes', 'Playball', cursive",
          color: textColor,
        }}
      >
        Hammam Nile
      </h1>
    </div>
  );
};

export default HammamNileLogo;
