/**
 * Correctif du 11/10/2026 : sur le téléphone de l'auteur, `getShaderPrecisionFormat` d'expo-gl
 * répondait `undefined` et three.js plantait (`Cannot read property 'precision' of undefined`).
 */
import { guardPrecisionFormat, HIGHP_FLOAT_FORMAT } from '../glCompat';

describe('guardPrecisionFormat', () => {
  it('une réponse vide devient le format highp standard', () => {
    const gl = { getShaderPrecisionFormat: jest.fn().mockReturnValue(undefined) };

    guardPrecisionFormat(gl);

    expect(gl.getShaderPrecisionFormat(35633, 36338)).toEqual(HIGHP_FLOAT_FORMAT);
    expect(gl.getShaderPrecisionFormat(35632, 36338).precision).toBeGreaterThan(0);
  });

  it('une vraie réponse passe telle quelle, avec ses arguments', () => {
    const real = { rangeMin: 15, rangeMax: 15, precision: 10 };
    const native = jest.fn().mockReturnValue(real);
    const gl = { getShaderPrecisionFormat: native };

    guardPrecisionFormat(gl);

    expect(gl.getShaderPrecisionFormat(35632, 36337)).toBe(real);
    expect(native).toHaveBeenCalledWith(35632, 36337);
  });

  it('appliqué une seule fois, et sans effet sur un contexte absent ou incomplet', () => {
    const native = jest.fn().mockReturnValue(null);
    const gl = { getShaderPrecisionFormat: native };

    guardPrecisionFormat(gl);
    const wrapped = gl.getShaderPrecisionFormat;
    guardPrecisionFormat(gl);
    expect(gl.getShaderPrecisionFormat).toBe(wrapped);

    expect(() => guardPrecisionFormat(null)).not.toThrow();
    expect(() => guardPrecisionFormat({})).not.toThrow();
  });
});
