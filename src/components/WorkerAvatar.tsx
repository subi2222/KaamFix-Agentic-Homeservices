import React, { useState } from "react";
import { User } from "lucide-react";

interface WorkerAvatarProps {
  photoURL?: string | null;
  profileImage?: string | null;
  name?: string;
  className?: string;
  sizeClassName?: string;
}

export default function WorkerAvatar({
  photoURL,
  profileImage,
  name = "Worker",
  className = "",
  sizeClassName = "w-12 h-12 text-lg"
}: WorkerAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const imageUrl = photoURL || profileImage || null;
  const initial = name ? name.trim().charAt(0).toUpperCase() : "W";

  if (import.meta.env.DEV && imageUrl && !imgError) {
    console.log(`[WorkerAvatar] Rendering profile image for "${name}": ${imageUrl}`);
  }

  if (imageUrl && !imgError) {
    return (
      <div className={`relative rounded-full overflow-hidden shrink-0 border border-emerald-100/80 bg-gray-100 ${sizeClassName} ${className}`}>
        <img
          src={imageUrl}
          alt={name}
          onError={() => {
            console.warn(`[WorkerAvatar] Image failed to load for "${name}" (${imageUrl}). Falling back to avatar initials.`);
            setImgError(true);
          }}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold flex items-center justify-center uppercase shrink-0 shadow-sm border border-emerald-200/50 ${sizeClassName} ${className}`}
      title={name}
    >
      {initial ? (
        <span>{initial}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-white/90" />
      )}
    </div>
  );
}
