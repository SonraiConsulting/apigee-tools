// Extract, transform and load Company records from Apigee Edge to an Apigee X Project as AppGroups.
// Read in the results from Apigee Edge Company details list, including related developers, and convert to AppGroup format including developer members, and write to Apigee X project
// © 2023, Sonrai Consulting Pty Ltd, info@sonrai.com.au

const fs = require('fs');
const axiosRequest = require('axios');
const prompt = require('prompt-sync')();

//Prompt for user input to access Apigee Edge Org and Apigee X project.
const org = prompt('Enter the Apigee Edge Organization name to get the Company records from:')
const token = prompt('Enter your Apigee Edge OAuth2 token:');
const apigee_x_project = prompt('Enter the Apigee X Project to load the transformed AppGroups into:')
const gcp_token = prompt('Enter the GCP OAuth2 token:')

//Extract - get Company records and save them to a local file.
//Set variables for the API call from user input to get Company records from Apigee Edge.
function extract(org, token, callback) {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.enterprise.apigee.com/v1/o/' + org + '/companies?expand=true',
    headers: { 
      'Authorization': 'Bearer ' +token
    }
  };
  //Make request to Apigee Edge for all company data and save into local companies.json file
  try {
    axiosRequest.request(config)
      .then(response => {
        console.log(response.data);
        fs.writeFileSync('companies.json', JSON.stringify(response.data, null, "\t"))
        callback();
      })
  }
  catch (error) {
    console.log(error);
  }
}

//Transform - using companies.json file, transform dataset into AppGroup format. This function is a callback from the extract function.
//Process the AppGroups and add members to the AppGroup as "member" and "app_developers"
async function transform(){
  //Use the data in the JSON file previously written by the extract function.
  try {
    var dataSet = fs.readFileSync('./companies.json', 'utf8')
    } catch (err) {
    console.error(err)
    }
    
  //convert dataSet to JSON and place just the company records into a variable
  const company_data = JSON.parse(dataSet);
  const companyRecords = company_data.company

  //Create appGroup array shell
  var appGroupArray = {"appGroups":[]};

  for(const [i, company] of companyRecords.entries()) {
    //Remove the unneeded values from the company record (not needed when writing the AppGroup)
    delete company['organization'];
    delete company['createdAt'];
    delete company['createdBy'];
    delete company['lastModifiedAt'];
    delete company['lastModifiedBy'];
    var adminEmail = company.attributes[0].value;
    //Set the admin of the AppGroup. This value will be used if there's no other members.
    company.attributes[0] = {"name" : "__apigee_reserved__developer_details", "value" : "[{\"developer" + "\":" + "\"" + adminEmail + "\"" + ",\"" + "roles\"" + ":[\"admin" + "\"]}]"}
    adminEntry = "{\"developer" + "\":" + "\"" + adminEmail + "\"" + ",\"" + "roles\"" + ":[\"admin" + "\"]}";

    // Get developer members for the company
    memberRecords = await getDevelopers(token, org, company.name)
    var membersValue = "";
    for(const [i, member] of memberRecords.developer.entries()) {
      memberEmail = member.email;
      //If the memberEmail is not the adminEmail add the developer member to the membersValue as a member and app_developer
      if (memberEmail != adminEmail) {
        memberEntry = "{\"developer" + "\":" + "\"" + memberEmail + "\"" + ",\"" + "roles\"" + ":[\"member" + "\"" + ",\"" + "app_developer" + "\"]},";
        membersValue = memberEntry.concat(membersValue);
      }
    }
    //Set the members of the AppGroup
    company.attributes[0] = {"name" : "__apigee_reserved__developer_details", "value" : "[" + membersValue + adminEntry + "]"}
    appGroupArray.appGroups.push(company);
  }
  fs.writeFileSync('./appGroups.json', JSON.stringify(appGroupArray, null, "\t"))
  console.log(appGroupArray);
  load(apigee_x_project,gcp_token)
}

//Get the developer members on the company record
async function getDevelopers(token, org, company) {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.enterprise.apigee.com/v1/o/' + org + '/companies/' + company + '/developers',
    headers: { 
      'Authorization': 'Bearer ' + token
    }
  };

  try {
    //Wait for the response before returning the developers
    let response = await axiosRequest.request(config)
    return response.data;
  } catch (error) {
    console.error(`ERROR: ${error}`)
  }
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
  console.log(appGroup_data.appGroups[1])

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
