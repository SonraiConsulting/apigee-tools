// Get a GCP Token with this NodeJS snippet. Using a Service Account key (as a JSON file) this will output an OAuth2 token. The token can be used in subsequent calls to Apigee X (or other GCP services).
// © 2024, Sonrai Consulting Pty Ltd, info@sonrai.com.au
//See documentation here; https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest#json-web-tokens

//NOTE: The following 2 statements can be used when using commonjs, not a module type deployment; in package.json file, change: "type":"module" to "type":"commonjs"
  //const {JWT} = require('google-auth-library');
  //const keys = require('./apigeex-sonrai-key.json');

//These 3 statements can be used when using node modules ("type": "module")
//The import {JWT} will create "JWT" as a constructor (aka a function)
import {JWT} from 'google-auth-library';
import fs from 'fs';
//Update the statement below with the location of your Service Account Key file.
var keys = JSON.parse(fs.readFileSync('./service-account-key.json'));


async function main() {
  const client = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const url = `https://apigee.googleapis.com/v1/organizations/${keys.project_id}`;
  const res = await client.request({url});
  console.log(res.data);
  console.log(client.credentials.access_token);
}

main().catch(console.error);
