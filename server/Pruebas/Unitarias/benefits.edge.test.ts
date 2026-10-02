import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularBeneficios } from '../../services/benefitsCalculationService.js';

test('RF18 calcula cero desahucio cuando el motivo es renuncia voluntaria', () => {
  // Arrange
  const input = {
    fechaIngreso: '01/01/2024', fechaRetiro: '01/04/2024', motivo: 'Renuncia Voluntaria' as const,
    salarioMes1: 3000, salarioMes2: 3000, salarioMes3: 3000, diasVacacionesPendientes: 0,
  };

  // Act
  const result = calcularBeneficios(input);

  // Assert
  assert.equal(result.desahucio.subtotal, 0);
  assert.equal(result.spi, 3000);
});