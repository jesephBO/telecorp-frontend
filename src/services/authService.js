const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const SESSION_KEY = 'telecorp.session.v1';

async function cognito(target, payload) {
  if (!CLIENT_ID) throw new Error('Configura VITE_COGNITO_CLIENT_ID en frontend/.env.local.');
  const response = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify({ ClientId: CLIENT_ID, ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(cognitoMessage(body.__type, body.message));
  return body;
}

function cognitoMessage(type = '', message = '') {
  const code = String(type).split('#').pop().split('.').pop();
  const readable = {
    UserNotFoundException: 'No encontramos una cuenta con ese correo.',
    NotAuthorizedException: 'Correo o contraseña incorrectos.',
    UserNotConfirmedException: 'Confirma tu correo antes de iniciar sesión.',
    UsernameExistsException: 'Ya existe una cuenta con ese correo.',
    CodeMismatchException: 'El código no coincide. Revísalo e inténtalo de nuevo.',
    ExpiredCodeException: 'El código venció. Solicita uno nuevo.',
    InvalidPasswordException: 'La contraseña debe cumplir la política de Cognito.',
    TooManyRequestsException: 'Hay demasiados intentos. Espera un momento y vuelve a probar.',
  };
  return readable[code] || message || 'No pudimos completar la solicitud de acceso.';
}

export function getSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!value?.IdToken) return null;
    const decoded = JSON.parse(atob(value.IdToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(result) {
  const value = result.AuthenticationResult;
  if (!value?.IdToken) throw new Error('Cognito no devolvió un token de identidad.');
  const session = {
    IdToken: value.IdToken,
    AccessToken: value.AccessToken,
    RefreshToken: value.RefreshToken,
    expiresAt: Date.now() + Number(value.ExpiresIn || 3600) * 1000,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signIn(email, password) {
  const result = await cognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email.trim().toLowerCase(), PASSWORD: password },
  });
  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    return { ChallengeName: result.ChallengeName, Session: result.Session, username: email.trim().toLowerCase() };
  }
  return { session: saveSession(result) };
}

export async function completeNewPassword(challenge, password) {
  const result = await cognito('RespondToAuthChallenge', {
    ChallengeName: challenge.ChallengeName,
    Session: challenge.Session,
    ChallengeResponses: { USERNAME: challenge.username, NEW_PASSWORD: password },
  });
  return saveSession(result);
}

export async function signUp({ email, password, dni, phone }) {
  const UserAttributes = [
    { Name: 'email', Value: email.trim().toLowerCase() },
    ...(dni ? [{ Name: 'custom:dni', Value: dni.trim() }] : []),
    ...(phone ? [{ Name: 'phone_number', Value: phone.trim() }] : []),
  ];
  return cognito('SignUp', { Username: email.trim().toLowerCase(), Password: password, UserAttributes });
}

export async function confirmSignUp(email, code) {
  return cognito('ConfirmSignUp', { Username: email.trim().toLowerCase(), ConfirmationCode: code.trim() });
}

export async function resendConfirmation(email) {
  return cognito('ResendConfirmationCode', { Username: email.trim().toLowerCase() });
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function tokenClaims(session) {
  try {
    const token = JSON.parse(atob(session.IdToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    let groups = token['cognito:groups'] || [];
    if (typeof groups === 'string') {
      try { groups = JSON.parse(groups); } catch { groups = groups.replace(/^\[|\]$/g, '').split(/[\s,]+/); }
    }
    return { sub: token.sub, email: token.email, groups: Array.isArray(groups) ? groups : [] };
  } catch {
    return { sub: '', email: '', groups: [] };
  }
}
