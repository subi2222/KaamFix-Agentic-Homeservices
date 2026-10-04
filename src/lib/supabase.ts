import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export const BUCKET_NAME = 'worker-profiles';

export interface UploadImageResult {
  publicUrl: string | null;
  error: string | null;
}

/**
 * Compresses an image file using Canvas to a clean 400x400 JPEG data URL.
 * Produces a small (~25-35KB) data URL safe for reliable persistence.
 */
export function compressImageToDataUrl(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to render image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads or replaces a worker's profile image in Supabase Storage.
 * Allowed formats: jpg, jpeg, png, webp
 * Max file size: 5 MB (5 * 1024 * 1024 bytes)
 * Includes instant fallback to compressed Data URL if Supabase RLS or bucket policies restrict direct anon writes.
 */
export async function uploadWorkerProfileImage(
  workerId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadImageResult> {
  try {
    if (!workerId) {
      return { publicUrl: null, error: 'Worker ID is required' };
    }

    // 1. File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        publicUrl: null,
        error: 'Invalid file format. Please upload JPG, PNG, or WEBP images only.'
      };
    }

    // 2. File size validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        publicUrl: null,
        error: 'File size exceeds 5MB limit. Please choose a smaller image.'
      };
    }

    const supabase = getSupabase();
    
    // Determine extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${workerId}/profile-image.${ext}`;

    if (onProgress) onProgress(20);

    // 1. Attempt upload to Supabase Storage if configured
    if (supabase) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            if (onProgress) onProgress(100);
            return { publicUrl: cacheBustedUrl, error: null };
          }
        } else {
          console.warn('Supabase Storage notice:', uploadError.message);
        }
      } catch (sbErr) {
        console.warn('Supabase Storage attempt failed:', sbErr);
      }
    }

    // 2. Attempt upload to Firebase Storage if available
    if (storage && storage.app.options.storageBucket) {
      try {
        if (onProgress) onProgress(50);
        const storageRef = ref(storage, `workers/${workerId}/profile-image.${ext}`);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const fbUrl = await getDownloadURL(storageRef);
        if (onProgress) onProgress(100);
        return { publicUrl: fbUrl, error: null };
      } catch (fbErr: any) {
        console.warn('Firebase Storage upload notice (falling back to optimized data URL):', fbErr?.message || fbErr);
      }
    }

    // 3. Fallback: compress image to a high-quality 400x400 JPEG data URL
    if (onProgress) onProgress(80);
    const fallbackDataUrl = await compressImageToDataUrl(file);
    if (onProgress) onProgress(100);
    return { publicUrl: fallbackDataUrl, error: null };
  } catch (err: any) {
    console.warn('Storage exception, using optimized fallback:', err);
    try {
      const fallbackDataUrl = await compressImageToDataUrl(file);
      if (onProgress) onProgress(100);
      return { publicUrl: fallbackDataUrl, error: null };
    } catch {
      return {
        publicUrl: null,
        error: err instanceof Error ? err.message : 'An unexpected error occurred during image upload.'
      };
    }
  }
}

