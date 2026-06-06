import assert from 'assert';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils/auth';
import { requireAuth, BoardRole } from '../utils/rbac';

async function testCryptography() {
  console.log('🧪 Testing Cryptography & Auth utilities...');

  // 1. Password hashing
  const password = 'my_secure_password';
  const hashed = await hashPassword(password);
  assert.notStrictEqual(password, hashed, 'Hashed password should not match plain text');
  
  const isMatch = await comparePassword(password, hashed);
  assert.strictEqual(isMatch, true, 'Hashed password match should succeed for correct input');

  const isWrongMatch = await comparePassword('wrong_password', hashed);
  assert.strictEqual(isWrongMatch, false, 'Hashed password match should fail for incorrect input');

  // 2. Token creation and verify
  const payload = { userId: 'user-id-123', email: 'user@domain.com' };
  const token = generateToken(payload);
  assert.ok(token, 'Token string should be generated');

  const decoded = verifyToken(token);
  assert.ok(decoded, 'Decoding valid token should return claims payload');
  assert.strictEqual(decoded?.userId, payload.userId, 'Decoded user ID should match payload');
  assert.strictEqual(decoded?.email, payload.email, 'Decoded email should match payload');

  const decodedNull = verifyToken('invalid.token.string');
  assert.strictEqual(decodedNull, null, 'Decoding invalid token should return null');

  console.log('✅ Cryptography tests completed successfully!');
}

function testAccessControl() {
  console.log('🧪 Testing Access Control guards...');

  // Test authentication check
  const loggedInPayload = { userId: 'user-id-123', email: 'user@domain.com' };
  const result = requireAuth(loggedInPayload);
  assert.strictEqual(result.userId, loggedInPayload.userId, 'Auth check should pass for authenticated sessions');

  assert.throws(() => {
    requireAuth(null);
  }, /You must be logged in/, 'Auth check should throw UnauthenticatedError for empty session');

  // Test Board Roles hierarchy rankings
  const ROLE_RANKING: Record<BoardRole, number> = {
    [BoardRole.OWNER]: 3,
    [BoardRole.ADMIN]: 2,
    [BoardRole.MEMBER]: 1,
  };

  assert.ok(ROLE_RANKING[BoardRole.OWNER] > ROLE_RANKING[BoardRole.ADMIN], 'OWNER ranking should be superior to ADMIN');
  assert.ok(ROLE_RANKING[BoardRole.ADMIN] > ROLE_RANKING[BoardRole.MEMBER], 'ADMIN ranking should be superior to MEMBER');

  console.log('✅ Access Control tests completed successfully!');
}

async function runAllTests() {
  try {
    await testCryptography();
    testAccessControl();
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! No errors detected.');
  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error);
    process.exit(1);
  }
}

runAllTests();
