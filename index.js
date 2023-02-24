var axios = require('axios');

let on_values = [];
let off_values = [];

const splitName = 'basic';
const low = -10.0;
const high = -5.0;

let count = 0;
let result = NaN;
let splitStream = [];
let changeNumber;

createImpressionsAndEvents();

function createImpressionsAndEvents() {
	do {
		console.log(count++);

		on_values = [];
		off_value = [];

		for(let i = 0; i < 120; i++) {
			on_values.push(Math.floor(Math.random() * 100));
			off_values.push(Math.floor(Math.random() * 100));
		}

		const on_mean = calculateMean(on_values);
		const off_mean = calculateMean(off_values);

		result = (on_mean * 100 / off_mean) - 100;
	} while(result > high || result < low);

	console.log(calculateMean(on_values));
	console.log(calculateMean(off_values));

	changeNumber = getChangeNumber(splitName);
	changeNumber.then(function (value) {
		changeNumber = value;
		buildImpressionsAndEvents();
		sendImpressions(splitStream);
		sendEvents(splitStream);
	}, function (error) {
		console.log(error);	
	});
}

function buildImpressionsAndEvents() {
	console.log('buildImpressionsAndEvents!')

	for(let i = 0; i < on_values.length; i++) {
		var uuid = uuidv4();
		const data = [
		  {
		    f: splitName,
		    i: [
		      {
		        k: uuid,
		        t: Math.random() > 0.5 ? "on" : "off",
		        m: 1,
				c: changeNumber,
		        r: "default rule"
		      }
		    ]
		  }
		];

		const event = {
			key: uuid,
			eventTypeId: 'dbm_error',
			value: on_values[i],
			timestamp: new Date().getTime(),
			properties: { device: "atari" },
			trafficTypeName: "user",
		}

		let entry = {data: data, event: event};

		splitStream.push(entry);
	}	
}

async function getChangeNumber(splitName) {
	let result = 1;

	var config = {
	  method: 'get',
	  url: ' https://sdk.split.io/api/splitChanges?since=-1',
	  headers: { 
	    'Authorization': 'Bearer 70jiipvg64kkvds3ar48sf0ugrptgvpqts8d', 
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

function sendImpressions(splitStream) {
	let itr = 0;	
	for(const entry of splitStream) {
		let data = entry.data;

		let interval = 1000 * 60 * 60 * 24 * 1;
		const delta = 1000 * 60 * 60 * 1;

		const ts = new Date().getTime() - interval - (delta * itr++);
		data[0].i[0].m = ts; 
		console.log(new Date(ts));
		console.log(JSON.stringify(data, 0, 2));
		
		var config = {
		  method: 'post',
		  url: 'https://events.split.io/api/testImpressions/bulk',
		  headers: { 
		    'Authorization': 'Bearer 70jiipvg64kkvds3ar48sf0ugrptgvpqts8d', 
		    'Content-Type': 'application/json'
		  },
		  data: data 
		};
		// console.log(config);
		axios(config)
		.then(function (response) {
			console.log('o');
			// console.log(JSON.stringify(response.data));
		})
		.catch(function (error) {
		  console.log(error);
		  return;
		});
	}
}

function sendEvents(splitStream) {
	let itr = 0;

	for(const entry of splitStream) {
		let event = entry.event;

		let interval = 1000 * 60 * 60 * 24 * 1;
		const delta = 1000 * 60 * 60 * 1;

		const ts = new Date().getTime() - interval - (delta * itr++);	
		event.timestamp = ts;
		console.log(new Date(ts));

		var eventConfig = {
		  method: 'post',
		  url: 'https://events.split.io/api/events',
		  headers: { 
		    'Authorization': 'Bearer 70jiipvg64kkvds3ar48sf0ugrptgvpqts8d', 
		    'Content-Type': 'application/json'
		  },
		  data : event
		};		

		// console.log(eventConfig);
		axios(eventConfig)
		.then(function (response) {
		  // console.log(JSON.stringify(response.data));
			console.log('+');
		})
		.catch(function(error) {
		  console.log(error);
		  return;
		});		

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
