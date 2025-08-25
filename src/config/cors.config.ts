import { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    // We're listing all the headers in the request just to please iOS
    'Accept',
    'Content-Type',
    'X-Requested-With',
    'Origin',
    'Host',
    'Accept-Encoding',
    'Accept-Language',
    'Referer',
    'Access-Control-Allow-Origin',
    'Sec-Ch-Ua',
    'Sec-Ch-Ua-Mobile',
    'Sec-Ch-Ua-Platform',
    'User-Agent',
    'Authorization',
  ],
  credentials: true,
};
