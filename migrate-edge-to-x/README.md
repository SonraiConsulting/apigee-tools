# Tools for migrating Apigee Edge to Apigee X

Current release migrates from Apigee Edge to Apigee X:
- Companies into AppGroups. 

## Prerequisites
To use this Javascript tool you will need the following:
### Javascript prerequisites
- Node.js (v20 or higher)
- Node modules:
    - node-fetch
    - prompt-sync
    - axios

### Apigee prerequisites
- Apigee Edge Organization name
- Bearer token from Apigee Edge (that allows read access to the Edge Org)
- Apigee X Project name
- OAuth2 token from GCP (that allows full access to the Apigee X project)


## To run
Use node-js with a console for input and output.

### etl-companies-appgroups
This script will:
- extract Company records (including developers related to the Company) from the Edge ORG and store them in a local file called companies.json, local to where the script is run.
- transform  the Company records into a valid Apigee X AppGroup format. Add developers related to the Company as developers on AppGroup custom attribute. Exports output to file, appGroups.json, local to where the script is run.
- loads the appGroups.json file into Apigee X as appGroups.
#### Current Limitations:
- Company member roles are generally not set in Apigee Edge (ie. if using a Drupal portal to set developers against a company through invitations, Drupal does not set the role in Apigee Edge), therefore the developers added to the AppGroup are given both "member" and "app_developer" roles. Adjust the memberEntry value to suit which roles should be applicable.
- Company Apps to AppGroup-related Apps are not yet included.
