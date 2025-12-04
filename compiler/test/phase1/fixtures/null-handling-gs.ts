// Null and undefined handling (they are synonyms in GoodScript)

const processValue = (value: string | null): string => {
  if (value === null) {
    return 'no value';
  }
  return value;
};

const processOptional = (value: string | undefined): string => {
  if (value === undefined) {
    return 'undefined';
  }
  return value;
};

// null and undefined are interchangeable
const checkNullish = (value: string | null | undefined): boolean => {
  return value === null || value === undefined;
};

const findItem = (items: string[], predicate: (item: string) => boolean): string | null => {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return null;
};

// Nullish coalescing
const getDefaultValue = (value: number | null, defaultValue: number): number => {
  return value !== null ? value : defaultValue;
};

// Optional chaining scenarios
interface User {
  name: string;
  email?: string;
  address?: {
    street: string;
    city: string;
  };
}

const getUserEmail = (user: User): string => {
  return user.email !== undefined ? user.email : 'no email';
};

const getUserCity = (user: User): string | undefined => {
  if (user.address !== undefined) {
    return user.address.city;
  }
  return undefined;
};

export { processValue, processOptional, checkNullish, findItem, getDefaultValue, getUserEmail, getUserCity };
export type { User };
