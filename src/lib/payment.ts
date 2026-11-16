// Fixed payment details every student must have paid into.
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
  accountName: string;
  bankName: string;
  accountNumber: string;
  amountPaid: string;
};

export type FieldErrors = Partial<Record<keyof PaymentInput, string>>;

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

export const normalizeTellerId = (s: string) => s.trim().replace(/\s+/g, "").toUpperCase();
export const normalizeMatric = (s: string) => s.trim().replace(/\s+/g, "").toUpperCase();

/** Parses "2,000", "₦2000", "N2000.00", "2000 naira" etc. Returns NaN if not a number. */
export function parseAmount(raw: string): number {
  const cleaned = raw
    .toLowerCase()
    .replace(/naira|ngn|₦|n(?=\d)/g, "")
    .replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

function isZenith(bank: string) {
  const b = collapse(bank).toLowerCase().replace(/\./g, "");
  return ["zenith", "zenith bank", "zenith bank plc", "zenith plc"].includes(b);
}

/** Validates the form; returns field errors (empty object = verified). */
export function verifyPayment(input: PaymentInput): FieldErrors {
  const errors: FieldErrors = {};

  if (collapse(input.fullName).length < 3) errors.fullName = "Enter your full name.";
  if (normalizeMatric(input.matricNumber).length < 3) errors.matricNumber = "Enter your matric number.";

  const teller = normalizeTellerId(input.tellerId);
  if (!/^[A-Z0-9\-\/]{4,30}$/.test(teller)) {
    errors.tellerId = "Enter the teller ID printed on your bank teller (4–30 letters/digits).";
  }

  if (collapse(input.accountName).toLowerCase() !== REQUIRED_PAYMENT.accountName.toLowerCase()) {
    errors.accountName = "Account name does not match the university's account.";
  }
  if (!isZenith(input.bankName)) {
    errors.bankName = "Bank name does not match the university's bank.";
  }
  if (input.accountNumber.replace(/\s/g, "") !== REQUIRED_PAYMENT.accountNumber) {
    errors.accountNumber = "Account number does not match the university's account.";
  }
  const amount = parseAmount(input.amountPaid);
  if (Number.isNaN(amount)) {
    errors.amountPaid = "Enter the amount as a number, e.g. 2000.";
  } else if (amount !== REQUIRED_PAYMENT.amount) {
    errors.amountPaid = `Amount must be exactly ₦${REQUIRED_PAYMENT.amount.toLocaleString()}.`;
  }

  return errors;
}

export function cleanInput(input: PaymentInput) {
  return {
    fullName: collapse(input.fullName),
    matricNumber: normalizeMatric(input.matricNumber),
    tellerId: normalizeTellerId(input.tellerId),
    accountName: REQUIRED_PAYMENT.accountName,
    bankName: REQUIRED_PAYMENT.bankName,
    accountNumber: REQUIRED_PAYMENT.accountNumber,
    amountPaid: REQUIRED_PAYMENT.amount,
  };
}
