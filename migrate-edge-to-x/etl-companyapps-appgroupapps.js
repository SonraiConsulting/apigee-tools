// Migrates Apigee Edge Company Apps to Apigee X AppGroups Apps.
// Pre-requisites: 
//     1. Companies from Edge ORG must already be migrated as AppGroups into the target Apigee X project.
//     2. API Products listed against App credentials must be migrated to Apigee X project.
//
// Retrieves list of companies from the specified Apigee Edge ORG. Retrieves each company App and recreates that app in the specified Apigee X project.
// New App in Apigee X is related to the AppGroup (of the same name as was in Edge), APIs keys will be migrated and API Product relatioship will also be migrated.
// © 2023, Sonrai Consulting Pty Ltd, info@sonrai.com.au

const fs = require('fs');
const axiosRequest = require('axios');
const prompt = require('prompt-sync')();

console.log("GET Company Apps")
//Prompt for user input to access Apigee Edge Org and Apigee X project.
const org = prompt('Enter the Apigee Edge Organization name to get the Company records from: ')
const token = prompt('Enter your Apigee Edge OAuth2 token: ');
const apigee_x_project = prompt('Enter the Apigee X Project to load the transformed AppGroups into: ')
const gcp_token = prompt('Enter the GCP OAuth2 token: ')

var companyList = [];
var companyName = "";
var appList = [];

function getCompanies(org, token, callback) {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://api.enterprise.apigee.com/v1/o/' + org + '/companies',
      headers: { 
        'Authorization': 'Bearer ' +token
      }
    };
  
    try {
      axiosRequest.request(config)
        .then(response => {
          console.log(response.data);
          companyList = response.data;
          return callback(org, token, apigee_x_project, gcp_token, companyList);
        })
    }
    catch (error) {
      console.log(error);
    }
  }

async function getApps(org, token, apigee_x_project, gcp_token, companyList) {
    //For each company in the list, get their Apps
    for(const [i, company] of Object.entries(companyList)) {
        companyName = company;
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.enterprise.apigee.com/v1/o/' + org + '/companies/' + companyName + '/apps?expand=true',
            headers: { 
            'Authorization': 'Bearer ' + token
            }
        };
        try {
            let response = await axiosRequest.request(config)
            appList = response.data
            //write a new file for the companyName with all their apps for record keeping
            //fs.writeFileSync('companyApps-' + companyName + '.json', JSON.stringify(response.data, null, "\t"))
            if (appList.app.length != 0) {
                console.log("---Company apps for " + companyName + " ---")
                for(const  [i, app] of Object.entries(appList.app)) {
                    console.log('The App name is: ' + app.name)
                    console.log('')
                    //delete unneeded values from the app
                    delete app['appFamily'];
                    delete app['appId'];
                    delete app['companyName'];
                    delete app['createdAt'];
                    delete app['createdBy'];
                    delete app['lastModifiedAt'];
                    delete app['lastModifiedBy'];
                    //add appGroup name, same as company nameas an object to the JSON
                    app['appGroup'] = companyName;
                    console.log(app);
                    fs.writeFileSync('companyApps-' + companyName + '-' + app.name + '.json', JSON.stringify(app, null, "\t"))
                    
                    //POST initial appGroup App to Apigee X.
                    let configPostApp = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups/' + companyName + '/apps',
                        headers: { 
                          'Authorization': 'Bearer ' + gcp_token,
                          'Content-Type': 'application/json'
                        },
                        data: JSON.stringify(app)
                      };
                      try {
                        let response = await axiosRequest.request(configPostApp);
                        console.log(response.status + ' ' + response.statusText + ' - ' + '"' + response.data.name + '"' + ' in Apigee X project: ' + apigee_x_project)
                        //Put key initially created into a variable ready for deletion
                        let initialKey = response.data.credentials[0].consumerKey;

                        //DELETE Apigee X appGroup App initial credentials.
                        let configDel = {
                            method: 'delete',
                            maxBodyLength: Infinity,
                            url: 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups/' + companyName + '/apps/' + app.name + '/keys/' + initialKey,
                            headers: { 
                              'Authorization': 'Bearer ' + gcp_token
                            }
                          };
                          try {
                            let response = await axiosRequest.request(configDel);
                            console.log(response.status + ' ' + response.statusText + ' - ' + 'Initial credentials deleted in app ' + app.name + '"' + ' in Apigee X project: ' + apigee_x_project)
                          } catch (error) {
                            if (error.response) {
                              // The request was made and the server responded with a status code that falls out of the range of 2xx
                              console.log('ERROR: ' + error.response.status + ' - ' + error.response.data.error.message)
                            } else if (error.request) {
                              // The request was made but no response was received `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
                              console.log(error.request);
                            } else {
                              // Something happened in setting up the request that triggered an Error
                              console.log('Error', error.message);
                            }
                          }
                          
                        //For each credentials create a new key from original key,
                        for(const  [i, cred] of Object.entries(app.credentials)) {
                            //Add credentials to the Apigee X appGroup App based on old credentials.
                            //Set credData as the original consumerKey original consumerSecret and approval type, else credential will be pending, so leave the credential status as is (as pending cannot be set manually).
                            if (cred.status == 'approved' || cred.status == 'revoked') {                            
                                var credData = '{\n    "consumerKey": "' + cred.consumerKey + '",\n    "consumerSecret": "' + cred.consumerSecret + '",\n    "status": "' + cred.status + '"\n}';
                            } else {
                                var credData = '{\n    "consumerKey": "' + cred.consumerKey + '",\n    "consumerSecret": "' + cred.consumerSecret + '"\n}';
                            }
                            // POST add in credentials to AppGroup App based on the original Company App credentials
                            let configAddCred = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups/' + companyName + '/apps/' + app.name + '/keys',
                                headers: { 
                                'Authorization': 'Bearer ' + gcp_token,
                                'Content-Type': 'application/json'
                                },
                                data: credData
                            };
                            try {
                                let response = await axiosRequest.request(configAddCred);
                                console.log(response.status + ' ' + response.statusText + ' - ' + 'Credentials added to app ' + '"' + app.name + '"' + ' in Apigee X project: ' + apigee_x_project)
                            } catch (error) {
                                if (error.response) {
                                // The request was made and the server responded with a status code that falls out of the range of 2xx
                                console.log('ERROR: ' + error.response.status + ' - ' + error.response.data.error.message)
                                } else if (error.request) {
                                // The request was made but no response was received `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
                                console.log(error.request);
                                } else {
                                // Something happened in setting up the request that triggered an Error
                                console.log('Error', error.message);
                                }
                            }
                            
                            //For loop to add in the API Products to the credentials in the status they should be from the original app.
                            for(const  [i, apiprod] of Object.entries(cred.apiProducts)) {
                            
                                // POST add the API Products to AppGroup App credentials based on the original Company App API Products. 
                                // This list will be appended to the existing list of associated API Products for this App Key. Duplicates will be ignored.
                                let configAddProd = {
                                    method: 'post',
                                    maxBodyLength: Infinity,
                                    url: 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups/' + companyName + '/apps/' + app.name + '/keys/' + cred.consumerKey,
                                    headers: { 
                                    'Authorization': 'Bearer ' + gcp_token,
                                    'Content-Type': 'application/json'
                                    },
                                    data: prodData
                                };
                                try {
                                    let response = await axiosRequest.request(configAddProd);
                                    console.log(response.status + ' ' + response.statusText + ' - ' + 'Product ' + '"' + apiprod.apiproduct + '"' + ' added to credentials for app ' + '"' + app.name + '"' + ' in Apigee X project: ' + apigee_x_project)
                                } catch (error) {
                                    if (error.response) {
                                    // The request was made and the server responded with a status code that falls out of the range of 2xx
                                    console.log('ERROR: ' + error.response.status + ' - ' + error.response.data.error.message)
                                    } else if (error.request) {
                                    // The request was made but no response was received `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
                                    console.log(error.request);
                                    } else {
                                    // Something happened in setting up the request that triggered an Error
                                    console.log('Error', error.message);
                                    }
                                }
                                
                                //If the status should be approved or revoked, Update the status of the API Product on the credentials.
                                if (apiprod.status == 'approved' || apiprod.status == 'revoked') {                            
                                    var action = apiprod.status.slice(0, -1);
                                    let configProdStatus = {
                                        method: 'post',
                                        maxBodyLength: Infinity,
                                        url: 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups/' + companyName + '/apps/' + app.name + '/keys/' + cred.consumerKey + '/apiproducts/' + apiprod.apiproduct + '?action=' + action,
                                        headers: { 
                                        'Authorization': 'Bearer ' + gcp_token,
                                        'Content-Type': 'application/json'
                                        }
                                    };
                                    try {
                                        let response = await axiosRequest.request(configProdStatus);
                                        console.log(response.status + ' ' + response.statusText + ' - ' + 'Product ' + '"' + apiprod.apiproduct + '"' + ' status updated to ' + '"' + apiprod.status + '"' + ' on credentials for app ' + '"' + app.name + '"' + ' in Apigee X project: ' + apigee_x_project);
                                    } catch (error) {
                                        if (error.response) {
                                        // The request was made and the server responded with a status code that falls out of the range of 2xx
                                        console.log('ERROR: ' + error.response.status + ' - ' + error.response.data.error.message)
                                        } else if (error.request) {
                                        // The request was made but no response was received `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
                                        console.log(error.request);
                                        } else {
                                        // Something happened in setting up the request that triggered an Error
                                        console.log('Error', error.message);
                                        }
                                    } 
                                }
                            }
                        }

                      } catch (error) {
                        if (error.response) {
                          // The request was made and the server responded with a status code that falls out of the range of 2xx
                          console.log('ERROR: ' + error.response.status + ' - ' + error.response.data.error.message)
                        } else if (error.request) {
                          // The request was made but no response was received `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
                          console.log(error.request);
                        } else {
                          // Something happened in setting up the request that triggered an Error
                          console.log('Error', error.message);
                        }
                      }

                }
            }
        } catch (error) {
            console.log(error);
        }
    }
}

getCompanies(org, token, getApps)
