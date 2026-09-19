import Joi from 'joi';
import { HttpError } from '../errors';
import { enumQuery, uuidParam, validate } from '../validation';

const thrownBy = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (err) {
    return err;
  }
  return undefined;
};

describe('http/validation', () => {
  it('uuidParam : forme uuid de Postgres acceptée (nil UUID compris), sinon 404 NOT_FOUND', () => {
    expect(uuidParam('11111111-1111-4111-8111-111111111111', 'École')).toBe(
      '11111111-1111-4111-8111-111111111111'
    );
    expect(uuidParam('00000000-0000-0000-0000-000000000000', 'École')).toBe(
      '00000000-0000-0000-0000-000000000000'
    );
    const bad = thrownBy(() => uuidParam('not-a-uuid', 'École'));
    expect(bad).toBeInstanceOf(HttpError);
    expect(bad).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'École introuvable' });
    expect(thrownBy(() => uuidParam(undefined, 'École'))).toMatchObject({ status: 404 });
  });

  it('enumQuery : valeur absente → undefined, connue → renvoyée, inconnue → 400', () => {
    expect(enumQuery(undefined, ['a', 'b'], 'x')).toBeUndefined();
    expect(enumQuery('a', ['a', 'b'], 'x')).toBe('a');
    expect(thrownBy(() => enumQuery('c', ['a', 'b'], 'x'))).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('validate : valeur typée quand ok, détail Joi sinon', () => {
    const schema = Joi.object<{ n: number }>({ n: Joi.number().required() });
    expect(validate(schema, { n: '3' })).toEqual({ ok: true, value: { n: 3 } });
    const bad = validate(schema, {});
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.detail).toContain('"n"');
    }
  });
});
