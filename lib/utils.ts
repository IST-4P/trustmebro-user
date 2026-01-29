import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an error value to a string safely
 * Handles error objects, strings, and other types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error
  }
  if (error && typeof error === "object") {
    // Handle error objects with message property
    if ("message" in error && typeof error.message === "string") {
      return error.message
    }
    // Handle error objects with error property
    if ("error" in error && typeof error.error === "string") {
      return error.error
    }
    // Fallback to JSON stringify for complex objects
    return JSON.stringify(error)
  }
  return String(error || "An error occurred")
}
