import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularBeneficios } from '../../services/benefitsCalculationService.js';

const validInput = {
  fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado' as const,
  salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15,
};

test('RF18 aplica las causales existentes sin cambiar sus fórmulas', () => {
  // Arrange
  const resignationInput = { ...validInput, motivo: 'Renuncia Voluntaria' as const };
  const justifiedInput = { ...validInput, motivo: 'Despido Justificado' as const };

  // Act
  const resignation = calcularBeneficios(resignationInput);
  const justified = calcularBeneficios(justifiedInput);

  // Assert
  assert.equal(resignation.desahucio.subtotal, 0);
  assert.equal(justified.desahucio.subtotal, 0);
  assert.equal(resignation.indemnizacion.subtotal, 10500);
});