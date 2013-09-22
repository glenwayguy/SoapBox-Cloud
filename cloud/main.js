
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
var SendGrid = require("sendgrid");
var express = require('express');
var http = require('http');

SendGrid.initialize("SoapBoxApp", "MHacks2013");

var app = express();




Parse.Cloud.define("hello", function(request, response) {

});

Parse.Cloud.job("ticker", function(request, status) {
	Parse.Cloud.useMasterKey();
	var everythingQuery = new Parse.Query("Issue");
	everythingQuery.find({
		success: function(results) {
			var json = results[0].toJSON();
			console.log(json.Alchemy);
			var alchemy = [];
			var id = [];
			for (var i = results.length - 1; i >= 0; i--) {
				var json = results[i].toJSON();
				alchemy.push(json.Alchemy);
				id.push(json.objectId);
			}
			console.log(alchemy, id);
			var integer = Math.round(Math.random() * Math.pow(2,32));
			var sign = 1;
			if (integer % 2) {
				sign *= -1;
			}
			var increment = (integer % 5)/5;
			increment *= sign;
			console.log('increment set');
			for(var i = 0; i < alchemy.length; i++) {
				alchemy[i] = alchemy[i] + increment;
				console.log('increment Alchemy values');
			}
			console.log(results.length);
			for (var i = 0; i < results.length; i++) {
				console.log('In the loop');
				var finalQuery = new Parse.Query("Issue");

				(function(i) {
					finalQuery.get(id[i], {
						success: function(object) {
							console.log('success');
							object.set('Alchemy', alchemy[i]);
							console.log('ABout to save')
							object.save();
						},
						error: function(object, error) {
							console.log("error");
						}
					});
				})(i);
			}
		status.success();

		}
	})
	
});

Parse.Cloud.beforeSave("Issue", function(request, response) {
	if (request.object.get('Alchemy') != null) {
	var text = request.object.get('Title') + ' ' + request.object.get('Description');
	console.log(text);
	Parse.Cloud.httpRequest({
		method: "GET",
		url: 'http://access.alchemyapi.com/calls/text/TextGetRankedKeywords',
		params: {
			"apikey": "2094dd01fd7cbceb7e1bb916840e40e81f25d16f",
			"sentiment": "1",
			"outputMode": "json",
			"text": text
		},
		success: function(httpResponse) {
			var json = JSON.parse(httpResponse.text);
			var alchemy = 0;
			console.log(json.keywords);
			for (var i = 0; i < json.keywords.length; i++) {
				var relevance = 0;
				if (json.keywords[i].sentiment.type == "negative") {
					var relevance = json.keywords[i].relevance * 5;
					console.log('Is negative');
				}
				else {
					var relevance = -1
					console.log('neutral or positive');
				}
				alchemy = alchemy + relevance;
			}
			request.object.set("Alchemy", alchemy);
			response.success();
		},
		error: function(httpResponse) {
			console.log('error');
		}
	});
} else if (request.object.get('Alchemy') === 200) {
	//TODO - SendGrid
}
	
});

Parse.Cloud.define("email_blast", function(request, response) {
	var query = new Parse.Query('email');
	query.find({
		success: function(results) {
			var emails = [];
			for(var i = 0; i < results.length; i++) {
				var json = results[i].toJSON();
				emails.push(json.Email_Address);
			}
			Parse.Cloud.run("email", { "to":emails, "subject": "Welcome to SoapBox!", "message": "Welcome to SoapBox!" }, { 
				success: function(httpResponse) {
				    // ratings should be 4.5
				},
				error: function(error) {
				}
			}
		);
	}
}
);
});

Parse.Cloud.define("email", function(request, response) {
	var emails = request.params.to[0];
	var i = 1;
	while(i <= request.params.to.length){
		emails.concat("to[]=" + request.params.to[i]);
		i++;
	}

	SendGrid.sendEmail({
		"to[]": emails,
  		from: "SoapBox@charleyhutchison.co.nf",
  		subject: request.params.subject,
  		text: request.params.message
	}, {
	  success: function(httpResponse) {
	    console.log(httpResponse);
	    response.success("Email sent!");
	  },
	  error: function(httpResponse) {
	    console.error(httpResponse);
	    //response.error("Uh oh, something went wrong");
	    response.error(httpResponse);
	  }
	});
});

