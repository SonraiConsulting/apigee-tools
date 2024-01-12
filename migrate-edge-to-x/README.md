# Tools for migrating Apigee Edge to Apigee X

Current release migrates from Apigee Edge to Apigee X:
- Companies into AppGroups.
- Company Apps into AppGroup Apps.

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

### etl-companyapps-appgroupapps
This script will:
- extract a list of Company names from the Edge ORG, then using that list it will iteratively pull a list from Edge of the Apps for each Company.
- transform each Company App into an AppGroup App (related to an AppGroup with the same name as it exists as a Company in Edge)
- DELETE the inital credentials on the app (as creating a new app creates an initial set of API keys by default)
- Creates new credentials based on the Company App credentials.
- Add API Products and the correct status as per the Company App.
#### Current Limitations:
- Once an AppGroup App is added the script will not update existing AppGroup Apps with credential, custom-attribute, scope or API Product changes.

## Further Information
For further information, or if you're looking for Apigee expertise, please reach out to us at mailto:info@sonrai.com.au
