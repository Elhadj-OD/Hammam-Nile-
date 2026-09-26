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
      viewBox="0 0 160 105.3"
      className={className}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/*
        Emblème officiel Hammam Nile — contour tracé directement depuis la
        photo du logo réel (silhouette d'oiseau : tête + bec bien visibles
        à droite, plumes/traînées effilées à gauche), pour que les traits
        du visage/bec restent nets au lieu d'un contour approximatif.
      */}
      <path
        d="M 154.3,91.3 L 155.6,83.0 L 153.4,79.6 L 145.6,75.7 L 134.7,74.8 L 131.2,70.4 L 127.3,55.2 L 127.8,48.3 L 137.8,35.7 L 142.5,21.8 L 149.9,14.4 L 155.1,11.8 L 153.8,9.2 L 141.2,4.4 L 125.6,4.0 L 113.9,7.5 L 86.5,20.1 L 67.4,21.4 L 4.0,8.8 L 4.0,10.5 L 47.0,27.5 L 47.0,30.9 L 43.1,31.4 L 15.3,25.7 L 17.0,28.3 L 59.2,46.6 L 59.2,50.0 L 55.2,50.5 L 25.7,43.1 L 25.7,44.8 L 70.9,65.7 L 70.9,70.0 L 53.5,67.0 L 53.5,68.7 L 68.7,77.0 L 69.1,83.0 L 93.0,94.3 L 116.5,100.4 L 131.2,100.4 L 140.4,98.7 L 149.5,95.2 Z"
      />
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
      {/* Blue Emblem — woman's head with flowing hair */}
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
