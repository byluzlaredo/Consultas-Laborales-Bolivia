import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBenefitsInput } from '../../services/benefitsCalculationService.js';

const validInput = {
  fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado' as const,
  salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15,
};

test('RF17 rechaza sueldos vacíos, negativos y días de vacaciones negativos', () => {
  // Arrange
  const emptySalary = { ...validInput, salarioMes1: 0 };
  const negativeSalary = { ...validInput, salarioMes2: -1 };
  const negativeVacationDays = { ...validInput, diasVacacionesPendientes: -1 };

  // Act
  const emptySalaryResult = validateBenefitsInput(emptySalary);
  const negativeSalaryResult = validateBenefitsInput(negativeSalary);
  const negativeVacationResult = validateBenefitsInput(negativeVacationDays);

  // Assert
  assert.equal(emptySalaryResult.valid, false);
  assert.equal(negativeSalaryResult.valid, false);
  assert.equal(negativeVacationResult.valid, false);
});