const NIGERIA_COUNTRY_CODE = "234";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeNigerianPhoneToE164(rawPhone: string): string | null {
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = digitsOnly(trimmed);
    if (!digits.startsWith(NIGERIA_COUNTRY_CODE) || digits.length !== 13) {
      return null;
    }
    return `+${digits}`;
  }

  const digits = digitsOnly(trimmed);

  if (digits.startsWith(NIGERIA_COUNTRY_CODE) && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+${NIGERIA_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return null;
}

export function toBulkSmsNigeriaRecipient(phoneE164: string): string {
  return phoneE164.startsWith("+") ? phoneE164.slice(1) : phoneE164;
}
