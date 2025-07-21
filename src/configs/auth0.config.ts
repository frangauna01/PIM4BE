import { envs } from './envs.config';

export const auth0 = {
  authRequired: false,
  auth0Logout: true,
  secret: envs.auth0.secret,
  baseURL: envs.auth0.baseUrl,
  clientID: envs.auth0.clientID,
  issuerBaseURL: envs.auth0.domain,
};
