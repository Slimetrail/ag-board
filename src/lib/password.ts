export type PasswordCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export function passwordChecks(password: string): PasswordCheck[] {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return [
    { id: "length", label: "At least 8 characters", ok: password.length >= 8 },
    { id: "lower", label: "A lowercase letter", ok: hasLower },
    { id: "upper", label: "A capital letter", ok: hasUpper },
    {
      id: "extra",
      label: "A number or special character",
      ok: hasNumber || hasSpecial,
    },
  ];
}

export function passwordError(password: string): string | null {
  const failed = passwordChecks(password).filter((item) => !item.ok);
  if (failed.length === 0) return null;
  return `Password needs: ${failed.map((item) => item.label.toLowerCase()).join(", ")}.`;
}
