// Mirrors backend PasswordPolicy for early feedback only; the server remains authoritative.
export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;
const BANNED_FRAGMENTS = ['password', 'athleticaos', 'ragbi', 'qwerty', 'letmein', 'welcome', '12345678'];

export function passwordProblem(password: string, email?: string): string | null {
    if (!password.trim()) return 'Password is required';
    if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
        return `Password must be at most ${PASSWORD_MAX_BYTES} bytes`;
    }
    const lower = password.toLowerCase();
    if (BANNED_FRAGMENTS.some(fragment => lower.includes(fragment))) {
        return 'Password must not contain common words or the product name';
    }
    const localPart = email?.split('@')[0]?.toLowerCase() ?? '';
    if (localPart.length >= 4 && lower.includes(localPart)) return 'Password must not contain the email address';
    if (new Set(password).size < 6) return 'Password is too repetitive';
    return null;
}

// 63 symbols (no look-alikes) x 20 chars ~= 119 bits. Rejection sampling avoids modulo bias.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!@#%';

export function generateStrongPassword(email?: string, length = 20): string {
    const limit = 256 - (256 % ALPHABET.length);
    const byte = new Uint8Array(1);
    let password: string;
    do {
        const chars: string[] = [];
        while (chars.length < length) {
            crypto.getRandomValues(byte);
            if (byte[0] < limit) chars.push(ALPHABET[byte[0] % ALPHABET.length]);
        }
        password = chars.join('');
    } while (passwordProblem(password, email));
    return password;
}
