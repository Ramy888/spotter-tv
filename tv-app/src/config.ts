// Deployed endpoints (stack SpotterRelay, eu-central-1). Update after `cdk deploy` if they change.
export const RELAY_URL = 'wss://x4iyt0hbv6.execute-api.eu-central-1.amazonaws.com/live';
export const PHONE_URL = 'https://yannegqpb2hvrix2nmxxbbygqm0ldexn.lambda-url.eu-central-1.on.aws/';

// The between-set coach asks the relay for an AI rewrite of its line (docs/set-coach.md). Off: the
// rule-based line and the fixed clips only.
export const SET_COACH_AI = true;
