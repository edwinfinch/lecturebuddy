global var mood = "";

$(function() {
    $.ajax({
        url: "https://api.projectoxford.ai/emotion/v1.0/recognize",
        beforeSend: function(xhrObj){
            // Request headers
            xhrObj.setRequestHeader("Content-Type","application/json");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","d7a37fa199af4ce49960731af5aaf227");
        },
        type: "POST",
        // Request body
        data: '{"url": "https://www.lecturebuddy.net/images/microsoft.png"}',
    })

    .done(function(data) {
        var emotions = [];
        emotions.length = 8;
        var current_emotion = [];
        var max = [];

        for (var i = 0; i < 8; i++)
        	emotions[i] = 0;

        for (var i = 0; i < 1; i++) {
        	max[i] = 0;
        	current_emotion[i] = "";
        }

        for (var i = data.length - 1; i >= 0; i--) {
        	for (var j = emotions.length - 1; j >= 0; j--) {
            	emotions[j] += data[i].scores[Object.keys(data[i].scores)[j]] * 100 / data.length;
            }
        }

        for (var i = 0; i < emotions.length; i++) {
        	if (emotions[i] > 80) {
        		max[0] = emotions[i];
        		max[1] = 0;
        		current_emotion[0] = Object.getOwnPropertyNames(data[0].scores)[i];
        	} else {
        		if (emotions[i] > max[0]) {
        			max[1] = max[0];
        			max[0] = emotions[i];
        			current_emotion[1] = current_emotion[0];
        			current_emotion[0] = Object.getOwnPropertyNames(data[0].scores)[i];
        		} else if (emotions[i] > max[1]) {
        			max[1] = emotions[i];
        			current_emotion[1] = Object.getOwnPropertyNames(data[0].scores)[i];
        		}
        	}
        }

		console.log(current_emotion);

		if (current_emotion[0] == "neutral" && current_emotion[1] == "sadness") {
			mood = 'bored';
		} else if ((current_emotion[0] == "neutral" && current_emotion[1] == "happiness") || current_emotion[0] == "happiness") {
			mood = 'content'
		} else if ((current_emotion[0] == "sadness" && (current_emotion[1] == "neutral" || current_emotion[1] == "anger")) || (current_emotion[0] == "anger" && (current_emotion[1] == "sadness" || current_emotion[1] == "neutral")) || (current_emotion[0] == "neutral" && current_emotion[1] == "anger")) {
			mood = 'confused'
		} else {
			mood = current_emotion[0];
		}

		console.log(mood);
    })

    .fail(function(error) {
        console.log(error.getAllResponseHeaders());
        alert("fail");
    });
});