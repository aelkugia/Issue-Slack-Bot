// Import express and request modules
var express = require('express');
var request = require('request');
var axios = require('axios');
var qs = require('qs');
require('dotenv').config();

var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var GITHUB_SECRET = process.env.GITHUB_SECRET;
var SLACK_ACCESS_TOKEN = process.env.SLACK_ACCESS_TOKEN;

// Instantiates Express and assigns our app variable to it

var bodyParser = require('body-parser')
var app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// Here we are defining the port we want to listen to
// This will be used by ngrok based on port we want to expose to the public internet (./ngrok http 4390)
const PORT=4390;

// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("App listening on port " + PORT);
});


// This route handles GET requests to our root ngrok address and responds with the 
//	same "Ngrok is working message" we used before
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url);
});

// This route handles get request to a /oauth endpoint. Used as endpoint for handling 
//	logic of Slack oAuth process.
app.get('/oauth', function(req, res) {
    // 	When a user authorizes an app, a code query parameter is passed on the 
    //	oAuth endpoint. If that code is not there, we respond with an error message

    if (!req.query.code) {
        res.sendStatus(500);
        res.send({"Error": "Looks like we're not getting code. Confirm permission scopes are set properly in OAuth & Permssions section in Slack API."});
        console.log("Looks like we're not getting code. Confirm permission scopes are set properly in OAuth & Permssions section in Slack API.");
    } else {
        // If it's there...

        // GET call to Slack's `oauth.access` endpoint, passing our app's CLIENT_ID,
        // CLIENT_SECRET, and code recieved as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, CLIENT_ID: CLIENT_ID, CLIENT_SECRET: CLIENT_SECRET}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {

            if (error) {
                console.log(error);
           		res.sendStatus(500);
           		res.send({"Error": "In requesting https://slack.com/api/oauth.access."});
            } else {
                res.json(body);

            }
        })
    }
});

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function(req, res) {

    var trigger_id = req.body.trigger_id
  // TODO: Would be good to add validation for request here. When the request is NOT coming from Slack
  // just make it not found to the potential attacker
	const dialogData = {
	  token: SLACK_ACCESS_TOKEN,
	  trigger_id: trigger_id,
	  dialog: JSON.stringify({
	    title: 'Open New Issue',
	    callback_id: 'issue',
	    submit_label: 'Submit',
 		elements: [
	      {
	        type: 'text',
	        label: 'Title',
	        name: 'title',
	      },
	      {
	        type: 'textarea',
	        label: 'Description',
	        name: 'body',
	        placeholder: 'Leave a comment',
	      },
	    ],
	  })
	};

// Open the dialog by calling the dialogs.open method and sending the payload
  	axios.post('https://slack.com/api/dialog.open', qs.stringify(dialogData))
	  .then((result) => {
	      if(result.data.error) {
	        res.sendStatus(500);
	      } else {
	        res.send('');

	      }
	   })
	  .catch((err) => {
	      res.sendStatus(500);
  	});

});

// Endpoint to receive dialog submission. 
app.post('/interactive', (req, res) => {
  const body = JSON.parse(req.body.payload);

  // Check that the verification token matches expected value

  //res.send('');

  var issueData = {
	  title:body.submission.title,
	  body:body.submission.body
	};

  var options = {
	  host: 'api.github.com',
	  path: '/repos/aelkugia/Issue-Slack-Bot/issues?access_token='+GITHUB_SECRET+'&scope=public_repo', // Repo can be updated here, path follows: /repos/GITHUB_USER_NAME/REPOSITORY/...
	  headers: { 
	    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0', // Listing user-agent which allows network protocol peers to identify app type, OS, software vendor/version. To ensure allowance of accessing issues repo
	  },
	  method: 'POST'
	};

  // This will take what user enters in Slack Dialog Box, and submit it to Github Issues of the repo identified
  // Will assign to myself in this case
  var issueBody = JSON.stringify({
	
	  "title": issueData.title,
	  "body": issueData.body,
	  "assignees": ["aelkugia"]
	}

	);

  // Sending payload to Github with "issue" that will be posted to the repo in issueBody

	axios.post('https://'+options.host+options.path, issueBody)

	  .then((result) => {

	      if(result.data.error) { 
	      	console.log(result.data.error)
	      	res.sendStatus(500);
	      } else {
	        res.send('');
	      }
	   })
	  .catch((err) => {

	  		if(err.response.status == 422) {
	  			console.log("Sending invalid fields. Please ensure assignee, label, and milestone exist in Github.");
	  		} else if (err.response.status == 400) {
	  			console.log("Sending wrong type of JSON value. Please review body message.");
	  		} else {
	  			console.log("The following error occured:" + err.response.statusText);
	  		}
  	});

});









