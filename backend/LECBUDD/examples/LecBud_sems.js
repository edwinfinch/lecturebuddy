var SemantriaSession = require("../").Session;
var promise = require('promise');
var config = require('../test-config');
try { config = require('../test-config.override') } catch(e) {}

var consumerKey = config.consumerKey,
	consumerSecret = config.consumerSecret,
	appConfigurationId = false,
	appConfigurationName = "LectureBuddy",
	collectionId = false,
	SemantriaActiveSession = new SemantriaSession(consumerKey, consumerSecret, "myApp");

//THIS IS TORI TRYING THINGS
var total_score = 0;
var overall_mood = 'neutral';
var pos_score = 0;
var neg_score = 0;
var neut_score = 0;

if (config.apiHost) {
	SemantriaActiveSession.API_HOST = config.apiHost
}

console.log("LectureBuddy");

//get or create test app configuration
SemantriaActiveSession.getConfigurations(true)
.then(function(configurations) {
	for (var i=0; i<configurations.length; i++) {
		if (configurations[i].name == appConfigurationName) {
			return promise.resolve([configurations[i]]);
		}
	}
	return SemantriaActiveSession.addConfigurations([{
		name: appConfigurationName,
		is_primary: false,
		auto_response: false,
		language: "English"
	}], true);
})
.then(function(result){
	appConfigurationId = result[0].id;

	// Creates a sample collection which need to be processed on Semantria
	collectionId = '' + Math.floor(Math.random() * 10000000);

	// Queues collection for processing on Semantria service
	return SemantriaActiveSession.queueCollection({
		id: collectionId,
		documents: getCollectionDocuments()
	}, appConfigurationId, true);
})
.then(function() {
	console.log("Collection #" + collectionId + " queued successfully.");

	//Wait while Semantria process queued collection
	return new promise(function(resolve, reject) {
		var wait_fn = function () {
			console.log("Retrieving your processed results...");
			SemantriaActiveSession.getCollection(collectionId, appConfigurationId, true)
			.then(function(processedCollection) {
				if (processedCollection && processedCollection.status == 'PROCESSED') {
					return resolve(processedCollection)
				}
				setTimeout(wait_fn, 5000);
			});
		}
		setTimeout(wait_fn, 5000);
	});
})
.then(function(analyticData) {

	// Printing collection's facets
	console.log("\nCollection facets:");
	if (analyticData.facets) {
		for(var i=0, facet; facet=analyticData.facets[i]; i++) {

			// shows only facets that have more than one mention.
			// This cuts out the less relevant facets, and only shows the top ones!
			if (facet.count > 1){
			console.log("  %s : %s ", facet.label, facet.count );
		}
			// add up total for each to generate a whole sentiment_score
				total_score = total_score + (facet.positive_count - facet.negative_count);
				pos_score += facet.positive_count;
				neg_score += facet.negative_count;
				neut_score += facet.neutral_count;
			if (facet.attributes) {
				for(var j=0, attr; attr=facet.attributes[j]; j++) {
					console.log("    %s : %s", attr.label, attr.count);
				}
			}
		}
	} else {
		console.log("  No facets were extracted for this text");
	}

//total_score = 0;

	console.log("total score: Neg: %s, Pos: %s, Neut: %s", neg_score, pos_score, neut_score);

	if (total_score < 0){
		overall_mood = "Negative";
		console.log("Overall Class Mood: %s", overall_mood);
	}
	else if (total_score > 0) {
		overall_mood = "Positive";
		console.log("Overall Class Mood: Positive");
	}
	else {
		overall_mood = "Neutral";
		console.log("Overall Class Mood: Neutral");
	}

	// create an object to save to a json file!
	var obj_mood = {"OverallMood": overall_mood, "TotalScore": total_score, "NegScore": neg_score, "PosScore": pos_score, "NeutralScore": neut_score};

})

.catch(function(err) {
	console.log("Something went wrong, send help.\n");
	console.log(err);
	console.log(err.stack);
})
.then(function() {
	if (!appConfigurationId) return;
	return SemantriaActiveSession.removeConfigurations([appConfigurationId], true);
});

function getCollectionDocuments() {
	var initialTexts = require('./source.json');
	return initialTexts;
}
