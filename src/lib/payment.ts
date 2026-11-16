export const REQUIRED_PAYMENT = {
  accountName: "Wellspring University Ventures",
  bankName: "Zenith Bank",
  accountNumber: "1310392285",
  amount: 2000,
} as const;

export type PaymentInput = {
  fullName: string;
  matricNumber: string;
  tellerId: string;
};

export type FieldErrors = Partial<Record<keyof PaymentInput | "receipt", string>>;

export const normalizeTellerId = (s: string) => s.trim().replace(/\s+/g, "").toUpperCase();
export const normalizeMatric = (s: string) => s.trim().replace(/[\s-]+/g, "").toUpperCase();

export function verifyPayment(input: PaymentInput): FieldErrors {
  const errors: FieldErrors = {};
  if (input.fullName.trim().length < 3) errors.fullName = "Enter your full name.";
  if (!/^[A-Z]{3}\d{5}$/.test(normalizeMatric(input.matricNumber))) {
    errors.matricNumber = "Use 3 department letters, 2 entry-year digits, and 3 serial digits, e.g. MER24001.";
  }
  if (!/^[A-Z0-9\-/]{4,40}$/.test(normalizeTellerId(input.tellerId))) {
    errors.tellerId = "Enter a valid reference, transaction, transfer, or teller ID from the receipt.";
  }
  return errors;
}

export function cleanInput(input: PaymentInput) {
  return {
    fullName: input.fullName.trim().replace(/\s+/g, " "),
    matricNumber: normalizeMatric(input.matricNumber),
    tellerId: normalizeTellerId(input.tellerId),
    accountName: REQUIRED_PAYMENT.accountName,
    bankName: REQUIRED_PAYMENT.bankName,
    accountNumber: REQUIRED_PAYMENT.accountNumber,
    amountPaid: REQUIRED_PAYMENT.amount,
  };
}
