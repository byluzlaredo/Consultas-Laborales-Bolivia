import test from 'node:test';
import assert from 'node:assert/strict';
import { INVALID_BENEFITS_INPUT_MESSAGE, validateBenefitsInput } from '../../services/benefitsCalculationService.js';

const validInput = {
  fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado' as const,
  salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15,
};

test('RF17 rechaza fechas imposibles y retiro anterior', () => {
  // Arrange
  const invalidDate = { ...validInput, fechaIngreso: '31/02/2021' };
  const reversedDates = { ...validInput, fechaRetiro: '14/01/2021' };

  // Act
  const invalidDateResult = validateBenefitsInput(invalidDate);
  const reversedDatesResult = validateBenefitsInput(reversedDates);

  // Assert
  assert.equal(invalidDateResult.message, INVALID_BENEFITS_INPUT_MESSAGE);
  assert.equal(reversedDatesResult.message, INVALID_BENEFITS_INPUT_MESSAGE);
});