import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the backend base URL (without /api) for serving static files
 * This is derived from NEXT_PUBLIC_API_URL by removing /api
 */
export function getBackendBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://medicare-pro-sand.vercel.app/api';
  // Remove /api from the end if present
  return apiUrl.replace(/\/api$/, '') || 'https://medicare-pro-sand.vercel.app';
}
