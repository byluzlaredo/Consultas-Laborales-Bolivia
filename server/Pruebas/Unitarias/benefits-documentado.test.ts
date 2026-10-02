import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularBeneficios } from '../../services/benefitsCalculationService.js';

const validInput = {
  fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado' as const,
  salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15,
};

test('RF18 reproduce el caso documentado de despido injustificado', () => {
  // Arrange
  const input = validInput;

  // Act
  const result = calcularBeneficios(input);

  // Assert
  assert.equal(result.spi, 3500);
  assert.equal(result.tiempoServicio.totalDiasComerciales, 1080);
  assert.equal(result.indemnizacion.subtotal, 10500);
  assert.equal(result.desahucio.subtotal, 10500);
  assert.equal(result.aguinaldo.subtotal, 136.11);
  assert.equal(result.vacaciones.subtotal, 1750);
  assert.equal(result.totalFiniquito, 22886.11);
});