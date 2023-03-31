const axios = require('axios');
const fs = require('fs');
const readlineSync = require('readline-sync');

let on_values = [];
let off_values = [];

let config;
if(!fs.existsSync('config.json')) {
	config = {
		splitName: null,
		splitServerApiKey: null,
		impact: null,
		eventTypeId: null
	}
} else {
	const configJsonFile = fs.readFileSync('config.json');
	config = JSON.parse(configJsonFile);
}

let splitName = '';
if(config.splitName) {
	splitName = config.splitName;
}

let answer = readlineSync.question('split name [' + splitName + ']? ');
if(answer !== '') {
	splitName = answer;
}

let splitServerApiKey = '';
if(config.splitServerApiKey) {
	splitServerApiKey = config.splitServerApiKey;
}

answer = readlineSync.question('split server api key [' + splitServerApiKey + ']? ');
if(answer !== '') {
	splitServerApiKey = answer;
}

let impact = 0;
if(config.impact) {
	impact = config.impact;
}

answer = readlineSync.question('desired impact -50 to +50 [' + impact + ']? ');
if(answer !== '') {
	answer = parseInt(answer, 10);
}

let eventTypeId;
if(config.eventTypeId) {
	eventTypeId = config.eventTypeId;
}

answer = readlineSync.question('eventTypeId [' + eventTypeId + ']? ');
if(answer !== '') {
	eventTypeId = answer;
}

config.splitName = splitName;
config.splitServerApiKey = splitServerApiKey;
config.impact = impact;
config.eventTypeId = eventTypeId;

fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

const low = Math.min;
const high = Math.max;

let count = 0;
let result = NaN;
let splitStream = [];
let changeNumber;


createImpressionsAndEvents();
exportToCsv();

function exportToCsv() {
	for(let i = 0; i < on_values.length; i++) {	
		fs.appendFileSync('export.csv', '' + i + ',' + on_values[i] + ',' + off_values[i] + '\n');
	}
}

function createImpressionsAndEvents() {

	const c = (6 * impact) - 200;

	// const c = 100; // 53.56%
	// const c = 0; // 34.32%
	// const c = -100; // 9.45%
	// const c = -130; // inconclusive
	// const c = -225; // -14.93%
	// const c = -325; // -23.44%
  // const c = -500; // -47.51%
	do {
		// console.log(count++);

		on_values = [];
		off_value = [];

		const limit = 1000;
		for(let i = 0; i < limit; i++) {

			const right = Math.cos(i*4 * (Math.PI / 180)) * 1000;
			const left = (3 * right) / 4;
			
			let on_value = Math.max(c + right + (Math.random() * 100), 0);
			if(on_value == 0) {
				on_value = Math.random() * 100;
			}

			on_values.push(on_value);
			let off_value = Math.max(left+(Math.random() * 100), 0);
			if(off_value == 0) {
				off_value = Math.random() * 100;
			}
			off_values.push(off_value);
		}

		const on_mean = calculateMean(on_values);
		const off_mean = calculateMean(off_values);

		result = (on_mean * 100 / off_mean) - 100;
	} while(result > high || result < low);

	// console.log(calculateMean(on_values));
	// console.log(calculateMean(off_values));
	// console.log(result);

	changeNumber = getChangeNumber(splitName);
	changeNumber.then(function (value) {
		changeNumber = value;
		buildImpressionsAndEvents();
		sendImpressions(splitStream);
		sendEvents(splitStream);
		console.log('finished');		
	}, function (error) {
		console.log(error);	
	});
}

function buildImpressionsAndEvents() {
	console.log('buildImpressionsAndEvents!')

	for(let i = 0; i < on_values.length; i++) {
		const treatment = Math.random() > 0.5 ? "on" : "off"
		var uuid = uuidv4();
		const data = [
		  {
		    f: splitName,
		    i: [
		      {
		        k: uuid,
		        t: treatment,
		        m: 1,
						c: changeNumber,
		        r: "default rule"
		      }
		    ]
		  }
		];

		const dimensions = ['chrome', 'edge', 'firefox', 'android', 'ios'];
		const i = Math.floor(Math.random() * 100) % dimensions.length;

		const event = {
			key: uuid,
			eventTypeId: eventTypeId,
			value: treatment === 'on' ? on_values[i] : off_values[i],
			timestamp: new Date().getTime(),
			properties: { platform: dimensions[i] },
			trafficTypeName: "user",
		}

		if(dimensions[i] === 'ios') {
			event.value = event.value + 150;
		}

		let entry = {data: data, event: event};

		splitStream.push(entry);
	}	
}

async function getChangeNumber(splitName) {
	let result = 1;

	var config = {
	  method: 'get',
	  // url: ' https://sdk.split.io/api/splitChanges?since=-1',
	  url: ' https://sdk.split.io/api/splitChanges?since=-1',
	  headers: { 
	    'Authorization': 'Bearer ' + splitServerApiKey,
	    'Content-Type': 'application/json'
	  }
	};		

	// console.log(eventConfig);
	await axios(config)
	.then(function (response) {
	  for(const split of response.data.splits) {
	  	if(split.name === splitName) {
	  		result = split.changeNumber;
	  	}
	  }
	})
	.catch(function(error) {
	  console.log(error);
	});	

	return result;
}

const interval = 1000 * 60 * 60 * 24 * 1;
const delta = 1000 * 60 * 20;

function getTimestamp(itr) {
	return new Date().getTime() - interval - (delta * itr++);
}

function sendImpressions(splitStream) {
	let itr = 0;	
	let error = false;
	for(const entry of splitStream) {
		let data = entry.data;

		// backdating
		const ts = getTimestamp(itr++);

		// forwardating
		// const ts = new Date().getTime() + interval + (delta * itr++);
		
		data[0].i[0].m = ts; 
		console.log(new Date(ts));
		// console.log(JSON.stringify(data, 0, 2));
		
		var config = {
		  method: 'post',
		  // url: 'https://events.split.io/api/testImpressions/bulk',
		  url: 'https://events.split.io/api/testImpressions/bulk',
		  headers: { 
		    'Authorization': 'Bearer ' + splitServerApiKey, 
		    'Content-Type': 'application/json'
		  },
		  data: data 
		};
		// console.log(config);
		axios(config)
		.then(function (response) {
			// console.log('o');
			// console.log(JSON.stringify(response.data));
		})
		.catch(function (error) {
		  console.log(error);
		  error = true;
		});

		if(error) {
			return;
		}
	}
}

function sendEvents(splitStream) {
	let itr = 0;
	let error = false;

	for(const entry of splitStream) {
		let event = entry.event;

		// backdating
		const ts = getTimestamp(itr++);

		// forwardating
		// const ts = new Date().getTime() + interval + (delta * itr++);
		
		event.timestamp = ts;
		// console.log(new Date(ts));

		var eventConfig = {
		  method: 'post',
		  url: 'https://events.split.io/api/events',
		  headers: { 
		    'Authorization': 'Bearer ' + splitServerApiKey, 
		    'Content-Type': 'application/json'
		  },
		  data : event
		};		

		// console.log(eventConfig);
		axios(eventConfig)
		.then(function (response) {
		  // console.log(JSON.stringify(response.data));
			// console.log('+');
		})
		.catch(function(error) {
		  console.log(error);
		  error = true;
		});		
		if(error) {
			return;
		}

		setTimeout(() => {}, 500);
	}

}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calculateMean(list) {
	// console.log('calculateMean(list)' + list);
	let count = 0;
	let sum = 0;
	for(const value of list) {
		sum += value;
		count++;
	}

	const result = sum / count;
	// console.log('calculateMean result: ' + result);
	return result;
}
