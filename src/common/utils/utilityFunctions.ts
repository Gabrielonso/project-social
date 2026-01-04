export const formatPhone = (phone: string) => {
  return (phone?.length || 0) > 10
    ? phone.slice(phone.length - 10, phone.length)
    : phone;
};

export const convertNumber = (number: string) => {
  const rawNumber = number?.substring?.(number.length - 10, number.length);
  const convNum = `+234${rawNumber}`;
  return convNum;
};

export const hasSuccessStatusCode = (statusCode) => {
  return statusCode >= 200 && statusCode < 300;
};

export const toSentenceCase = (value: string) => {
  return value?.toLowerCase()?.replace(/^./g, value[0]?.toUpperCase());
};

export function hasExpired(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return expiry < now;
}

export function generatePassword(): string {
  const specialChars = '!@#$%^&*()_+><?£-';
  const numbers = '0123456789';
  const lowerCaseCharset = 'abcdefghijklmnopqrstuvwxyz';
  const upperCaseCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const specialCharLength = 2;
  const upperCharLength = 3;
  const lowerCharLength = 4;
  const numberLength = 5;

  let composedStr = '';

  for (let i = 0; i < specialCharLength; i++) {
    const randomIndex = Math.floor(Math.random() * specialChars.length);
    composedStr += specialChars.charAt(randomIndex);
  }
  for (let i = 0; i < lowerCharLength; i++) {
    const randomIndex = Math.floor(Math.random() * lowerCaseCharset.length);
    composedStr += lowerCaseCharset.charAt(randomIndex);
  }
  for (let i = 0; i < upperCharLength; i++) {
    const randomIndex = Math.floor(Math.random() * upperCaseCharset.length);
    composedStr += upperCaseCharset.charAt(randomIndex);
  }
  for (let i = 0; i < numberLength; i++) {
    const randomIndex = Math.floor(Math.random() * numbers.length);
    composedStr += numbers.charAt(randomIndex);
  }

  // Fisher-Yates Shuffle
  const strArr = composedStr.split('');
  for (let i = strArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strArr[i], strArr[j]] = [strArr[j], strArr[i]];
  }

  return strArr.join('');
}

export function containsSearchWord(str: string, searchWords: string[]) {
  const lowerStr = str.toLowerCase();
  return searchWords.some((word) => lowerStr.includes(word.toLowerCase()));
}

export function dateIsAfter(
  dateToCheck: Date,
  targetDate: string | Date,
): boolean {
  const date = new Date(dateToCheck);
  const compareDate = new Date(targetDate);

  compareDate.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date >= compareDate;
}

export function startOfStartDate(startDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfEndDate(endDate: Date) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function baseUsername(firstName: string, lastName: string) {
  const first = normalizeName(firstName).slice(0, 3);
  const last = normalizeName(lastName).slice(0, 3);

  return first + last;
}
