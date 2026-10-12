/**
 * Password rules shared by sign-up, change password and reset password.
 * Everything runs on the phone: the password is never sent anywhere to be checked.
 */

/** Passwords people pick most often (lower case). Any password that contains one of these is refused. */
const COMMON = [
  '12345678', '123456789', '1234567890', '87654321', '11223344', '12341234', '00000000', '11111111',
  'abcd1234', 'abc12345', 'abcdefg1', 'a1b2c3d4', 'aa123456', 'qwerty12', 'qwerty123', 'qwertyui', 'asdf1234', 'zxcv1234', '1q2w3e4r',
  'password', 'passw0rd', 'p@ssw0rd', 'iloveyou', 'welcome1', 'letmein1', 'admin123', 'test1234', 'changeme',
  'sayang', 'malaysia', 'wakira', 'bismillah', 'assalamualaikum',
];

export type PasswordWeakness = 'common' | 'sequence' | 'repeat' | 'personal';

/** Five or more characters in a row that go up or down by one: 12345, abcde, 98765. */
function hasSequence(s: string) {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    run = d === 1 || d === -1 ? run + 1 : 1;
    if (run >= 5) return true;
  }
  return false;
}

/** Why a password is easy to guess, or null when it is not. `personal` = parts of the person's name and e-mail. */
export function passwordWeakness(password: string, personal: string[] = []): PasswordWeakness | null {
  const p = password.toLowerCase();
  if (!p) return null;
  if (COMMON.some((c) => p.includes(c))) return 'common';
  if (hasSequence(p)) return 'sequence';
  if (/(.)\1{3,}/.test(p)) return 'repeat';
  const parts = personal
    .map((x) => x.trim().toLowerCase().replace(/^(bin|binti|bt|b\.)\s+/, ''))
    .flatMap((x) => x.split(/[\s@._-]+/))
    .filter((x) => x.length >= 3 && !['bin', 'binti', 'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'com', 'email'].includes(x));
  if (parts.some((x) => p.includes(x))) return 'personal';
  return null;
}

export type PasswordCheck = {
  longEnough: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  weakness: PasswordWeakness | null;
  /** Every rule passes. */
  ok: boolean;
  /** 0-3 for the strength meter. */
  score: number;
};

export function checkPassword(password: string, personal: string[] = []): PasswordCheck {
  const longEnough = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const weakness = passwordWeakness(password, personal);
  const base = [longEnough, hasLetter, hasNumber].filter(Boolean).length;
  const score = password ? Math.max(0, base - (weakness ? 1 : 0)) : 0;
  return { longEnough, hasLetter, hasNumber, weakness, ok: longEnough && hasLetter && hasNumber && !weakness, score };
}
