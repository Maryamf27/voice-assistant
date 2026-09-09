const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string; confirmPassword: string };
export function validateCredentials(input: Partial<Credentials>): string | null {
  if (!input.email || !emailPattern.test(input.email.trim())) return "Enter a valid email address.";
  if (!input.password || input.password.length < 8) return "Password must be at least 8 characters.";
  return null;
}
export function validateRegistration(input: Partial<Registration>): string | null {
  if (!input.name || input.name.trim().length < 2 || input.name.trim().length > 80) return "Name must be between 2 and 80 characters.";
  const credentialsError = validateCredentials(input); if (credentialsError) return credentialsError;
  if (input.password !== input.confirmPassword) return "Passwords do not match.";
  return null;
}
