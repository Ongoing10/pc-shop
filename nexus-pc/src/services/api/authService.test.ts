import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePhone,
  checkPasswordRequirements,
  evaluatePasswordStrength,
} from './authService';

test('email validation matches standard email addresses', () => {
  assert.equal(validateEmail('test@example.com'), true);
  assert.equal(validateEmail('user.name+tag@nexuspc.vn'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('user@'), false);
  assert.equal(validateEmail('@domain.com'), false);
});

test('phone validation identifies valid Vietnamese numbers', () => {
  assert.equal(validatePhone('0988888888'), true);
  assert.equal(validatePhone('0912345678'), true);
  assert.equal(validatePhone('+84912345678'), true);
  assert.equal(validatePhone('0398765432'), true);
  assert.equal(validatePhone('12345'), false); // too short
  assert.equal(validatePhone('0123456789'), false); // 01 is not a valid modern mobile prefix
});

test('password requirement evaluation checks length and character variety', () => {
  const weak = checkPasswordRequirements('123');
  assert.equal(weak.minLength, false);
  assert.equal(weak.isValid, false);

  const valid = checkPasswordRequirements('123456');
  assert.equal(valid.minLength, true);
  assert.equal(valid.isValid, true);

  const strong = checkPasswordRequirements('NexusPC@2026');
  assert.equal(strong.minLength, true);
  assert.equal(strong.hasUpper, true);
  assert.equal(strong.hasLower, true);
  assert.equal(strong.hasNumber, true);
  assert.equal(strong.hasSpecial, true);
});

test('password strength score increments for complexity', () => {
  const empty = evaluatePasswordStrength('');
  assert.equal(empty.score, 0);

  const weak = evaluatePasswordStrength('123456');
  assert.equal(weak.score, 20);
  assert.equal(weak.label, 'Yếu');

  const medium = evaluatePasswordStrength('nexus123');
  assert.equal(medium.score, 60);
  assert.equal(medium.label, 'Trung bình');

  const strong = evaluatePasswordStrength('Nexus@2026!');
  assert.equal(strong.score, 100);
  assert.equal(strong.label, 'Mạnh');
});
