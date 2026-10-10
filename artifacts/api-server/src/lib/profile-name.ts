type Claims = Record<string, unknown>;

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Only provider-supplied names; never derive a name from an email address. */
export function profileName(claims: Claims) {
  const firstName = text(claims.first_name, claims.given_name, claims.firstName);
  const lastName = text(claims.last_name, claims.family_name, claims.lastName);
  if (firstName || lastName) return { firstName, lastName };
  // Keep a full name intact: splitting names by spaces is culturally unreliable.
  return {
    firstName: text(claims.name, claims.preferred_username, claims.username),
    lastName: null,
  };
}
