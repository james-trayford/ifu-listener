let audioContext;
let audioBuffers;
let gainNodes;
let sourceNodes;
let pixCols;
let specWlens;
let specVals;
let specChart;
var canvas = document.getElementById('mycanvas');
var ctx = canvas.getContext('2d');

var panelsize = 16;
var npanel = 33;
var fadetime = 0.03;
var maxvol = 0.5

canvas.width  = panelsize * npanel;
canvas.height = panelsize * npanel;

var x = 0;
var y = 0;
var w = 0;

var curdx = -1;
var idx = 0;

var isMouseDown = false;

const setupContextButton = document.querySelector(".setup-context")

// ---------- load spectra files -----------------

function loadSpectra(filePath) {
  return new Promise((resolve, reject) => {
    fetch(filePath)
      .then(response => response.text())
      .then(data => {
          const lines = data.trim().split("\n");
	  const numbersArray = lines.map(line => line.split(',').map(parseFloat));
          // const numbersArray = lines.map(function(el){ return parseFloat(el.split(" "));});
	  resolve(numbersArray);
      })
      .catch(error => reject(error));
  });
}


//----------- load whitelight data -------------------

function loadWhiteLight(filePath, callback) {
  fetch(filePath)
    .then(response => response.text())
    .then(fileContent => {
      const rows = fileContent.split('\n');
      const dataArray = [];

      for (let i = 0; i < rows.length; i++) {
        const values = rows[i].split(',');
        dataArray.push(values);
      }

      callback(null, dataArray);
    })
    .catch(error => {
      callback(error, null);
    });
}

setupContextButton.addEventListener("click", () => {
    audioContext = new AudioContext();
    console.log("User Gestured to start Audio Context.");
    getSoundGrid().then((response) => {
	audioBuffers = response;
	[sourceNodes, gainNodes] = routeAudio();
    });
    console.log("Setup Done.");
});

async function getBuffer(row, col) {
    const filepath = `static/audio/snd_${row}_${col}.wav`;
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function getSoundGrid() {
    console.log("Setting Up Audio Grid.")
    buffers = [];
    for (var i = 0; i < npanel; i++) {
	for (var j = 0; j < npanel; j++) {
	    const cellBuffer = await getBuffer(i,j);
	    buffers.push(cellBuffer);
	}
    }
    return buffers;
}

function routeAudio() {
    var inc = 0
    var sources = [];
    var gains = [];
    for (var i = 0; i < npanel; i++) {
	for (var j = 0; j < npanel; j++) {
	    gainNode = audioContext.createGain();
	    gains.push(gainNode);
	    gains[inc].connect(audioContext.destination);
	    gains[inc].gain.value = 0.;

	    sourceNode = audioContext.createBufferSource();
	    sourceNode.buffer = audioBuffers[inc];
	    sourceNode.loop = true;
	    sourceNode.connect(gains[inc]);
	    sources.push(sourceNode);
	    sources[inc].start(0);
	    inc++;
	}
    }
    return [sources, gains];
}

function playSound(e) {
    updateCurdx(e);
    isMouseDown = true;
    idx = curdx;
    gainNodes[idx].gain.linearRampToValueAtTime(maxvol, audioContext.currentTime + fadetime);
    
}

function updateCurdx(e) {
    var canvasRect = canvas.getBoundingClientRect();
    xidx = Math.floor((e.clientX - canvasRect.left) / panelsize);
    yidx = Math.floor((e.clientY - canvasRect.top) / panelsize);
    curdx = xidx + npanel * yidx;
    specChart.data.datasets[0].data = specVals[curdx];
    specChart.update('none');
};

function stopSound(e) {
    if (isMouseDown){
	gainNodes[idx].gain.linearRampToValueAtTime(0., audioContext.currentTime + fadetime);
	// gainNodes[idx].gain.value = 0.;
	isMouseDown = false;
    }
};

// function updateVolume(x, y) {
//   var canvasRect = canvas.getBoundingClientRect();
//   var cenX = canvasRect.left + panelsize*0.5 + (idx%npanel)*panelsize;
//   var cenY = canvasRect.top + panelsize*0.5 + (Math.floor(idx/npanel))*panelsize;
//   var relX = (x - cenX)/panelsize;
//   var relY = (y - cenY)/panelsize;
//   volume = Math.min(Math.max(1-relX,0)*Math.max(1-relY,0),1);
//   gainNodes[idx].gain.value = volume;
// }

function switchSound(e) {
    gainNodes[idx].gain.linearRampToValueAtTime(0., audioContext.currentTime + fadetime);
    gainNodes[curdx].gain.linearRampToValueAtTime(maxvol, audioContext.currentTime + fadetime);
    // gainNodes[idx].gain.value = 0.;
    // gainNodes[curdx].gain.value = 1.;
}

function updateSound(e) {
  if (isMouseDown){
      updateCurdx(e);
      if (idx != curdx) {
	  switchSound(e);
	  idx = curdx
      }
  }
}

function makeGrid(){
    // ctx.fillStyle = 'hsl(' + 360 * Math.random() + ', 20%, 20%)';
    console.log(pixCols);
    inc = 0;
    for (var x = 0, i = 0; i < npanel; x+=panelsize, i++) {
	for (var y = 0, j = 0; j < npanel; y+=panelsize, j++) {	  
	    [rv,gv,bv] = pixCols[inc];
	    ctx.fillStyle = `rgb(${rv}, ${gv}, ${bv})`;
	    w = Math.floor(panelsize);
	    ctx.fillRect (y, x, w, w);
	    

	    inc++;
	}
    }
}

loadWhiteLight('static/pixcols.csv', (error, dataArray) => {
    if (error) {
      console.error('Error:', error);
    } else {
	pixCols = dataArray;
	makeGrid();
    }
});

const mycanvas = document.getElementById('mycanvas');
mycanvas.addEventListener('mousedown', playSound);
mycanvas.addEventListener('mouseup', stopSound);
mycanvas.addEventListener('mouseleave', stopSound);
mycanvas.addEventListener('mousemove', updateSound);

var chartcanvas = document.getElementById('myChart');
// var cdata = {
//   labels: ["January", "February", "March", "April", "May", "June", "July"],
//   datasets: [{
//       label: "My First dataset",
//       data: [0,0.1,0.2,0.3,0.4,0.5,0.6],
//       fill: false,
//       lineTension: 0.1,
//       backgroundColor: "rgba(75,192,192,0.4)",
//       borderColor: "rgba(75,192,192,1)",
//       borderCapStyle: 'butt',
//       borderDash: [],
//       borderDashOffset: 0.0,
//       borderJoinStyle: 'miter',
//       pointBorderColor: "rgba(75,192,192,1)",
//       pointBackgroundColor: "#fff",
//       pointBorderWidth: 1,
//       pointHoverRadius: 5,
//       pointHoverBackgroundColor: "rgba(75,192,192,1)",
//       pointHoverBorderColor: "rgba(220,220,220,1)",
//       pointHoverBorderWidth: 2,
//       pointRadius: 5,
//       pointHitRadius: 10,
//       tension: 1,
//       pointStyle: true,
//       animation: 'off',
//       data: pixCols,
//   }]
// };

// const fs = require('fs');

// fs.readFile('static/wlens.csv', 'utf8', (frerr, wldat) => {
//   if (frerr) {
//     console.error("Error reading the file:", frerr);
//     return;
//   }

//   const lines = wldat.trim().split('\n');
//   const numbersArray = lines.map(line => parseFloat(line));

//   console.log(numbersArray);
// });


// Initialize Chart.js
function initializeChart(wlensArray) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const initArray = new Array(wlensArray.length).fill(0);
    specChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: wlensArray, // Create labels based on array indices
            datasets: [{
                label: 'Spectral Dimension',
                data: initArray,
                borderColor: "#00000f",
                borderWidth: 1,
		pointStyle: false,
                fill: false
            }]
        },
        options: {
	    showLines: false,
	    showXLabels: 1,
	    tension: 0.3,
	    animation: {
		duration: 1000,
            },
	    scales: {
		y: {
		    max: 1.,
		    min: 0,
		}
	    }
        }
    });
}

// var cdata = {
//     labels : [ 6.5, 6.55, 6.6, 6.65, 6.7, 6.75, 6.8 ],
//     datasets : 
// 	[{
// 	    data : [ 0, 0, 0, 0, 0, 0, 0 ],
// 	    label : "Spectral Energy Distribution",
// 	    borderColor : "#00000f",
// 	    fill : false,
// 	    pointStyle: false,
// 	    tension: 0.3
// 	}],
//     showXLabels: false
// };

// function adddata() {
//   myLineChart.data.datasets.data = specWlens;
//   myLineChart.data.labels = specWlens;
//   myLineChart.update();
// }

// var option = {
//     showLines: false,
//     showXLabels: 3,
// };

// var myLineChart = new Chart(chartcanvas, {
//     type: 'line',
//     data: cdata,
//     options: {
// 	showLines: true,
// 	scales: {
//             xAxes: [{
// 		ticks: {
//                     maxTicksLimit: 3
// 		}
//             }]
// 	}
//     }
// });

loadSpectra('static/spec.csv')
    .then(spec => {
	specWlens = spec.shift();
	specVals = spec;
	initializeChart(specWlens);
	console.log(specWlens);
	console.log("complete");
  })
  .catch(error => {
    console.error('Error reading the file:', error);
  });
