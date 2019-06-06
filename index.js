// Import express and request modules
var express = require('express');
var request = require('request');
var axios = require('axios');
var qs = require('qs');
require('dotenv').config();

var clientId = process.env.clientId;
var clientSecret = process.env.clientSecret;
var githubSecret = process.env.githubSecret;
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

// Again, we define a port we want to listen to
const PORT=4390;

// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("App listening on port " + PORT);
});


// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url);
});

// This route handles get request to a /oauth endpoint. Used as endpoint for handling logic of Slack oAuth process.
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // If it's there...

        // GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and code recieved as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);

            }
        })
    }
});

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function(req, res) {

    var trigger_id = req.body.trigger_id

  //TODO: Would be good to add validation for request. When the request is NOT coming from Slack - just make it not found to the potential attacker

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

  res.send('');

});









