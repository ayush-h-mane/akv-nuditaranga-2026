export const ACHARYA_EMAIL_ERROR = "Use your official Acharya email ending with @acharya.ac.in.";

export function isAcharyaEmail(value) {
  return /^[^\s@]+@acharya\.ac\.in$/i.test((value || "").trim());
}
