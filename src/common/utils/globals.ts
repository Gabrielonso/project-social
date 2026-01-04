import * as crypto from 'crypto';
import axios from 'axios';
import { DEFAULT_LIMIT } from './constants';
import * as qs from 'querystring';
import { SortOrder } from 'src/common/interfaces/global';

export const randStringGenerator = (): string => {
  const match = Math.random()
    .toString(16)
    .match(/(?<=\.)\w+$/g);
  const value = match?.[0]?.slice(0, 14) ?? '';
  return value.length !== 13 ? randStringGenerator() : value;
};

export function generateNumberToken(tokenLength: number) {
  const randomNumber = Math.random().toString().split('.')[1];

  const token = randomNumber.slice(
    randomNumber.length - tokenLength,
    randomNumber.length,
  );
  return token;
}

export function cashFormatter(cash: string) {
  cash = cash + '';
  const indexOfDecimal = cash.indexOf('.');

  cash =
    cash.substr(indexOfDecimal).length > 3
      ? cash.substr(0, indexOfDecimal + 3)
      : cash;
  cash += cash.indexOf('.') === -1 ? '.00' : '';
  cash = cash.substr(cash.indexOf('.')).length == 2 ? cash + '0' : cash;
  return cash
    .replace(/(\d((?=(.{3})+$)))/g, '$1,')
    .replace(/,\./, '.')
    .replace('.00', '');
}

export function queryStringBuilder(
  columns: Array<string>,
  alias: string,
): string {
  let query = '';

  for (const column of columns) {
    if (typeof column === 'string') {
      query = query
        .concat(query.length === 0 ? '' : ' AND ')
        .concat(`${alias}.${column} = :${column}`);
    }
  }

  return query;
}

export const BCRYPT_SALT = 10;

export function parseCsv(csvString: string): string[][] {
  const result: string[][] = [];
  const rows = (csvString.match(/\.+$|.+/g) || []) as string[];

  for (const row of rows) {
    let temp = '';
    const rowData: string[] = [];

    for (let i = 0; i < row.length; i++) {
      if (row[i] !== ',') {
        temp += row[i];
      } else {
        rowData.push(temp);
        temp = '';
      }
    }

    rowData.push(temp);
    result.push(rowData);
  }

  return result;
}

export const acceptFileTypes = (mimeTypes: Array<string>) => (_, file, cb) => {
  cb(null, mimeTypes.includes(file.mimetype));
};

export function request(
  defaultHeader = {},
  options?: { isEncodedParams?: boolean },
  baseUrl?: string,
) {
  return (
    url,
    payload = {},
    method: 'POST' | 'GET' | 'PUT' = 'GET',
    header?: Record<string, any>,
  ) => {
    console.log('method: ', method);
    console.log(
      'payload: ',
      options?.isEncodedParams ? qs.stringify(payload) : payload,
    );
    console.log('header: ', Object.assign(defaultHeader, header || {}));

    if (baseUrl) {
      baseUrl = baseUrl.trim().replace(/\/$/, '');
      url = url.trim().replace(/^\//, '');
      url = `${baseUrl}/${url}`;
    }

    if (/GET/g.test(method)) {
      const genUrl = () => {
        const payloadKeys = Object.keys(payload);
        return payloadKeys.length === 0
          ? url
          : payloadKeys.reduce(
              (cum, index, i) =>
                `${cum}${index}=${payload[index]}${
                  i === payloadKeys.length - 1 ? '' : '&'
                }`,
              `${url}?`,
            );
      };

      url = genUrl();
      console.log('URL: ', url);
      return axios({
        url,
        method,
        headers: Object.assign(defaultHeader, header || {}),
        timeout: 140000,
      })
        .then((jsonResponse) => {
          return jsonResponse?.data;
        })
        .catch((exp) => {
          if (exp.message === 'Network Error') {
            exp.message = 'Network connection error';
          }

          return new Promise((_, reject) => {
            reject(exp.response?.data);
          });
        });
    } else if (method === 'PUT') {
      console.log('URL: ', url);
      return axios({
        url,
        method,
        data: payload,
        headers: Object.assign(defaultHeader, header || {}),
        timeout: 140000,
      })
        .then((jsonResponse) => {
          return jsonResponse?.data;
        })
        .catch((exp) => {
          if (exp.message === 'Network Error') {
            exp.message = 'Network connection error';
          }

          return new Promise((_, reject) => {
            reject(exp.response?.data);
          });
        });
    } else {
      console.log('URL: ', url);
      return axios({
        url,
        method,
        data: options?.isEncodedParams ? qs.stringify(payload) : payload,
        headers: Object.assign(defaultHeader, header || {}),
        timeout: 140000,
      })
        .then((jsonResponse) => {
          return jsonResponse?.data;
        })
        .catch((exp) => {
          if (exp.message === 'Network Error') {
            exp.message = 'Network connection error';
          }

          return new Promise((_, reject) => {
            reject(exp.response?.data);
          });
        });
    }
  };
}

export function getAbsoluteUrl(path) {
  const { API_BASE_URL } = process.env;
  return `${API_BASE_URL}${path.replace(/^(\/)(?=(.+))/g, '')}`;
}
export function getAbsoluteWebUrl(path) {
  const { WEB_BASE_URL } = process.env;
  return `${WEB_BASE_URL}${path.replace(/^(\/)(?=(.+))/g, '')}`;
}

export function sqlOr(conditions: Array<string>) {
  return conditions.map((condition) => condition.trim()).join(' OR ');
}

export function sqlAnd(conditions: Array<string>) {
  return conditions.map((condition) => condition.trim()).join(' AND ');
}

export function recomposeMapObject({
  fromKeys,
  toKeys,
  data,
  isArray,
}: {
  fromKeys: Array<string>;
  toKeys: Array<string>;
  data: Record<string, any> | Array<Record<string, any>>;
  isArray?: boolean;
}) {
  let result;
  if (isArray) {
    result = data.map((val) => {
      const composedObject = {};
      fromKeys.forEach((key, index) => {
        composedObject[toKeys[index]] = val[key] || null;
      });
      return composedObject;
    });

    return result;
  }

  result = {};
  fromKeys.forEach((key, index) => {
    result[toKeys[index]] = data[key] || null;
  });

  return result;
}

export function getSortParams(
  sort: string,
  defaultParams: [string, SortOrder],
): [string, SortOrder] {
  const result = sort
    ? (sort.split(':') as [string, SortOrder])
    : defaultParams;

  if (result[1]) result[1] = result[1]?.toUpperCase() as SortOrder;

  return result;
}

export function generateTransactionReference(transactionId: string) {
  const hash = crypto
    .createHmac('sha256', Buffer.from('FER_ASDFAD#@#@&!', 'hex'))
    .update(transactionId)
    .digest('hex');

  return hash.slice(0, 30);
}

export function composePagination({ count, pos, delta }) {
  return {
    count,
    pos: +pos || 0,
    delta: delta + pos > count ? count - pos : delta || DEFAULT_LIMIT,
  };
}

export function formatDate(date: Date) {
  const optionsDate: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
  };

  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };

  const dateFormatter = new Intl.DateTimeFormat('en-US', optionsDate);
  const timeFormatter = new Intl.DateTimeFormat('en-US', optionsTime);

  const formattedDate = dateFormatter.format(date);
  const formattedTime = timeFormatter.format(date);

  function getNumberSuffix(day: number) {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  const dayWithSuffix = `${date.getDate()}${getNumberSuffix(date.getDate())}`;

  return `${formattedDate.replace(/\d+/, dayWithSuffix)}, ${formattedTime}`;
}

export function generateOtp(size = 6) {
  if (size <= 0) {
    throw new Error('otp length can not be lesser than or equal to zero');
  }

  const match = Math.random()
    .toString()
    .match(/(?<=\d\.)\d+/g);
  const randomValue = match?.[0] ?? '';

  return randomValue.slice(
    Math.max(0, randomValue.length - size),
    randomValue.length,
  );
}

export function hexToRGB(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getForegroundColor(backgroundColorHex: string) {
  const rgb = hexToRGB(backgroundColorHex);

  if (!rgb) return '#ffffff';

  const luminance = 0.2126 * rgb['r'] + 0.7152 * rgb['g'] + 0.0722 * rgb['b'];
  return luminance < 140 ? '#ffffff' : '#000000';
}

export function ignoreCronExistsError(exp: any) {
  return /^Cron Job with the given name (.+) already exists. Ignored\.$/.test(
    exp.message,
  );
}

/**
 * best used to generate random strings
 * @param length default 30
 * @param pattern default 'aA0$', It defines the character content of the resulting generated random string (i.e a = lowercase inclusive, A = uppercase inclusive, 0 = numbers inclusive and $ = special characters inclusive)
 * @returns
 */
export function generateRandomString(
  length: number = 30,
  pattern: string = 'aA0$',
): string {
  const possibilities = {
    lowerCased: 'abcdefghijklmnopqrstuvwxyz',
    capitals: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    special: '$%&-@#',
  };

  let charSet = '';

  pattern.split('').forEach((char) => {
    if (!isNaN(parseInt(char))) {
      charSet += possibilities.numbers;
    } else if (/[a-z]/.test(char)) {
      charSet += possibilities.lowerCased;
    } else if (/[A-Z]/.test(char)) {
      charSet += possibilities.capitals;
    } else {
      charSet += possibilities.special;
    }
  });

  let result = '';

  for (let i = 0; i < length; i++) {
    const charMaxIndex = charSet.length - 1;
    let randomIndex = Math.floor(Math.random() * charMaxIndex);
    if (randomIndex < 0) randomIndex = 0;
    if (randomIndex > charMaxIndex) randomIndex = charMaxIndex;

    result += charSet.charAt(randomIndex);
  }

  return result;
}

export function snakeCaseToTitleCase(str: string) {
  const words = str.toLowerCase().split('_');
  const result = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return result;
}

export function resolvePaginationDelta(requestDelta: number | string) {
  const value = +requestDelta;

  if (!value || value > DEFAULT_LIMIT) return DEFAULT_LIMIT;

  return value;
}

export enum COUNTRIES_ENUM {
  NIGERIA = 'NG',
  KENYA = 'KE',
  ZIMBABWE = 'ZM',
  GHANA = 'GH',
}
