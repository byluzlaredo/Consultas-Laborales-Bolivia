import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBenefitsInput } from '../../services/benefitsCalculationService.js';

const validInput = {
  fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado' as const,
  salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15,
};

test('RF17 acepta fechas, sueldos y días válidos', () => {
  // Arrange
  const input = validInput;

  // Act
  const result = validateBenefitsInput(input);

  // Assert
  assert.deepEqual(result, { valid: true });
});