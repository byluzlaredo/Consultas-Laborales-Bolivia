import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBenefitsInput } from '../../services/benefitsCalculationService.js';

test('caja blanca cubre las ramas de entrada valida e invalida del calculo', () => {
  // Arrange
  const valid = { fechaIngreso: '01/01/2024', fechaRetiro: '01/04/2024', motivo: 'Renuncia Voluntaria' as const, salarioMes1: 3000, salarioMes2: 3000, salarioMes3: 3000, diasVacacionesPendientes: 0 };

  // Act
  const validResult = validateBenefitsInput(valid);
  const invalidResult = validateBenefitsInput({ ...valid, salarioMes1: 0 });

  // Assert
  assert.equal(validResult.valid, true);
  assert.equal(invalidResult.valid, false);
});