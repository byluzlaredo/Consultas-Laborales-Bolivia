export const getPasswordRequirementsMessage = (password: string): string | null => {
  const missingRequirements: string[] = [];

  if (password.length < 8) missingRequirements.push('tener al menos 8 caracteres');
  if (!/[A-Z]/.test(password)) missingRequirements.push('incluir una letra mayúscula');
  if (!/[0-9]/.test(password)) missingRequirements.push('incluir un número');
  if (!/[!@#$%^&*]/.test(password)) {
    missingRequirements.push('incluir un carácter especial (!@#$%^&*)');
  }

  return missingRequirements.length
    ? `La contraseña no cumple los requisitos. Requisitos faltantes: ${missingRequirements.join(', ')}.`
    : null;
};
