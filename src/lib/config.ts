import { typeid } from 'typeid-js';

export const CORS_HEADERS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*'
  }
};

export const SERVER_ID = typeid('server').toString();
