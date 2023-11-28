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
    - request

### Apigee prerequisites
- Apigee Edge Organization name
- Bearer token from Apigee Edge (that allows read access to the Edge Org)
- Apigee X Project name
- OAuth2 token from GCP (that allows full access to the Apigee X project)


## To run
Use node-js with a console for input and output.

### etl-companies-appgroups
This script will:
- extract Company records from the Edge ORG and store them in a local file called companies.json, local to where the script is run.
- transform  the Company records into a valid Apigee X AppGroup format, exports output to file, appGroups.json, local to where the script is run.
- loads the appGroups.json file into Apigee X as appGroups.
