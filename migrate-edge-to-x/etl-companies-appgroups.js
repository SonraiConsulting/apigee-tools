//Extract, transform and load Company records from Apigee Edge to an Apigee X Project as AppGroups.
//Read in the results from Apigee Edge Company details list, and convert to AppGroup format, and write to Apigee X project

const fs = require('fs');
const prompt = require('prompt-sync')();

const org = prompt('Enter the Apigee Edge Organization name to get the Company records from:')
const token = prompt('Enter your Apigee Edge OAuth2 token:');
const apigee_x_project = prompt('Enter the Apigee X Project to load the transformed AppGroups into:')
const gcp_token = prompt('Enter the GCP OAuth2 token:')

//Extract - get Company records and save them to a local file.
//Set variables for the API call from user input to get Company records from Apigee Edge.
function extract(org, token, callback){
  var request = require('request');
  var options = {
    'method': 'GET',
    'url': 'https://api.enterprise.apigee.com/v1/o/' + org + '/companies?expand=true',
    'headers': {
      'Authorization': 'Bearer ' + token
    }
  };
  //Export Apigee Edge Comapny response to a file (for record keeping)
  request(options, function (error, response) {
      if (error) throw new Error(error);
      fs.writeFileSync('./companies.json', response.body)
      console.log(response.body);

      //Read the file into variable dataSet (not used, but script can be edited to use this for validation if needed)
      try {
          var dataSet = fs.readFileSync('./companies.json', 'utf8')
          console.log(dataSet)
      } catch (err) {
          console.error(err)
      }
      //convert dataSet to JSON
      const company_data = JSON.parse(dataSet);
      console.log(company_data);
      //callback transform function
      callback();

    });
}

//Transform - using companies.json file, transform dataset into AppGroup format. This function is a callback from the extract function.
function transform(){
  //Use the data in the JSON file previously written by the extrct function.
  try {
  var dataSet = fs.readFileSync('./companies.json', 'utf8')
  } catch (err) {
  console.error(err)
  }

  //convert dataSet to JSON
  const company_data = JSON.parse(dataSet);
  //Number of companies in the data set
  var numCompanies = company_data.company.length
  //Create appGroup array shell
  var appGroup_array = {"appGroups":[]};

  for (var i = 0; i < numCompanies; i++) {
      //Get all the records from each of company record in the company_data.company and store in the companyRecord array
      var companyRecord = company_data.company[i];
      //Remove objects that are not required by the AppGroup format.
      delete companyRecord['organization'];
      delete companyRecord['createdAt'];
      delete companyRecord['createdBy'];
      delete companyRecord['lastModifiedAt'];
      delete companyRecord['lastModifiedBy'];
      //Remove the MINT_BILLING_TYPE element. This may need to be adjusted using an if statement, as this blindly removes the second object in the custom attribute array.
      companyRecord.attributes.splice(1,1)


      //Recreate the array based on the AppGroup format.
      appGroup_array.appGroups.push(companyRecord);
      var email = companyRecord.attributes[0].value;
      companyRecord.attributes[0] = {"name" : "__apigee_reserved__developer_details", "value" : "[{\"developer" + "\":" + "\"" + email + "\"" + ",\"" + "roles\"" + ":[\"admin" + "\"]}]"}
      }
  console.log(appGroup_array);
  //Convert array to a JSON string and prettify with tabs
  const appGroups = JSON.stringify(appGroup_array, null, "\t");
  fs.writeFileSync('./appGroups.json', appGroups)
  console.log(appGroups);
}

//Load - using appsGroups.json file, load dataset into Apigee X project
function load(apigee_x_project, gcp_token){
  try {
  var dataSet = fs.readFileSync('./appGroups.json', 'utf8')
  } catch (err) {
  console.error(err)
  }

  //convert dataSet to JSON
  const appGroup_data = JSON.parse(dataSet);
  console.log(appGroup_data.appGroups)

  //Create appGroups iteratively
  var numAppGroups = appGroup_data.appGroups.length
  console.log(numAppGroups)
  var request = require('request');
  for (var i = 0; i < numAppGroups; i++) {
      var options = {
          'method': 'POST',
          'url': 'https://apigee.googleapis.com/v1/organizations/' + apigee_x_project + '/appgroups',
          'headers': {
              'Authorization': 'Bearer ' + gcp_token,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(appGroup_data.appGroups[i])
          
          };
          request(options, function (error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
          });

  }
}

extract(org,token,transform)
load(apigee_x_project,gcp_token)
