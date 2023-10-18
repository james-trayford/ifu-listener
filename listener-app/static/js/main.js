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
var npanel =  nside;
var fadetime = 0.03;
var prefadetime = 0.03;
var maxvol = 0.9;
var minvol = 0.;

canvas.width  = panelsize * npanel;
canvas.height = panelsize * npanel;

var x = 0;
var y = 0;
var w = 0;

var curdx = -1;
var idx = 0;

var isMouseDown = false;
var isYAxisLog = false;
var isContextSetUp = false;
var useHelperSounds = false;

const setupContextButton = document.querySelector(".setup-context")
const switchYAxisButton = document.querySelector(".switch-axis")
const switchHelperButton = document.querySelector(".helper-switch")
const oobNotification = document.getElementById("oob-sound")

// ---------- toggle between light and dark modes ----------------

function toggleMode() {
  var element = document.body;
  element.classList.toggle("dark-mode");
}

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
    if (!isContextSetUp) {
	useHelperSounds = true;
	audioContext = new AudioContext();
	console.log("User Gestured to start Audio Context.");
	getSoundGrid().then((response) => {
	    audioBuffers = response;
	    [sourceNodes, gainNodes] = routeAudio();
	});
	console.log("Setup Done.");
    }
    isContextSetUp = true;
});

switchYAxisButton.addEventListener("click", () => {
    if (isYAxisLog){
	specChart.options.scales.y.type = 'linear';
	isYAxisLog = false;
	switchYAxisButton.innerHTML = 'Use Log Y Scale';
	console.log("Y-axis --> Linear scale.");
    }
    else {
	specChart.options.scales.y.type = 'logarithmic';
	isYAxisLog = true;
	switchYAxisButton.innerHTML = 'Use Linear Y Scale';
	console.log("Y-axis --> Log scale.");
    }
    specChart.update();

});

switchHelperButton.addEventListener("click", () => {
    if (useHelperSounds){
	useHelperSounds = false;
	switchHelperButton.innerHTML = 'Turn On Helper Sounds';
	console.log("Helper Sounds Off.");
    }
    else {
	useHelperSounds = true;
	switchHelperButton.innerHTML = 'Turn Off Helper Sounds';
	console.log("Helper Sounds On.");
    }
    specChart.update();

});

async function getBuffer(row, col) {
    const filepath = `static/audio/snd_${row}_${col}.wav`;
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function getSoundGrid() {
    console.log("Setting Up Audio Grid.");
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

    // filter output
    filter = audioContext.createBiquadFilter();
    filter.connect(audioContext.destination);
    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    for (var i = 0; i < npanel; i++) {
	for (var j = 0; j < npanel; j++) {
	    gainNode = audioContext.createGain();
	    gains.push(gainNode);
	    gains[inc].connect(filter); //audioContext.destination
	    gains[inc].gain.value = minvol;

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
    //gainNodes[idx].gain.linearRampToValueAtTime(maxvol, audioContext.currentTime + fadetime);
    gainNodes[idx].gain.setTargetAtTime(maxvol, audioContext.currentTime + prefadetime, fadetime);
    
}

function updateCurdx(e) {
    //console.log('Update...');
    var canvasRect = canvas.getBoundingClientRect();
    xidx = Math.floor((e.clientX - canvasRect.left) / panelsize);
    yidx = Math.ceil((canvasRect.bottom - e.clientY) / panelsize);
    curdx = xidx + npanel * yidx;
    specChart.data.datasets[0].data = specVals[curdx];
    specChart.update();
};

function stopSoundUp(e) {
    if (isMouseDown){
	gainNodes[idx].gain.setTargetAtTime(minvol, audioContext.currentTime + prefadetime, fadetime);
	isMouseDown = false;
    }
};

function stopSoundLeave(e) {
    if (isMouseDown){
	gainNodes[idx].gain.setTargetAtTime(minvol, audioContext.currentTime + prefadetime, fadetime);
	isMouseDown = false;
    }
    if (useHelperSounds){
	document.getElementById("out-sound").play();
    }
    // this can be annoying... disabling for now
    //oobNotification.play();
};

function enterCanvas(e) {
    if (useHelperSounds) {
	document.getElementById("in-sound").play();
	oobNotification.pause();
    }
}

function switchSound(e) {
    gainNodes[idx].gain.setTargetAtTime(minvol, audioContext.currentTime + prefadetime, fadetime);
    gainNodes[curdx].gain.setTargetAtTime(maxvol, audioContext.currentTime + prefadetime, fadetime);
}

function updateSound(e) {
  if (isMouseDown){
      updateCurdx(e);
      if (idx != curdx) {
	  switchSound(e);
	  idx = curdx;
      }
  }
}

function makeGrid(){
    // ctx.fillStyle = 'hsl(' + 360 * Math.random() + ', 20%, 20%)';
    inc = 0;
    for (var x = npanel*panelsize, i = npanel-1; i >= 0; x-=panelsize, i--) {
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
mycanvas.addEventListener('mouseup', stopSoundUp);
mycanvas.addEventListener('mouseleave', stopSoundLeave);
mycanvas.addEventListener('mousemove', updateSound);
mycanvas.addEventListener('mouseenter', enterCanvas);

oobNotification.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
}, false);

var chartcanvas = document.getElementById('myChart');

// Initialize Chart.js
function initializeChart(wlensArray) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const initArray = new Array(wlensArray.length).fill(0);
    Chart.defaults.color = '#808B96';
    specChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: wlensArray, // Create labels based on array indices
            datasets: [{
                label: 'Spectral Dimension',
                data: initArray,
                borderColor: "#808B96",
                borderWidth: 3,
		pointStyle: false,
                fill: false
            }]
        },
        options: {
	    showLines: false,
	    showXLabels: 1,
            plugins: {
              legend: {
	        labels: {
	           font: {
	               size: 16,
	               weight: "bold"
	               	           }
	        }
	      }
	    },
	    tension: 0.3,
	    animation: {
		duration: 60,
            },
	    scales: {
 		y: {
                  grid: {
                      color: 'rgb(128,139,150,0.2)'
                  },
                  ticks: {
                        font: {
                               size: 14,
	                       weight: "bold"
                         }
                    },
		    title: {
			display: true,
			text: "Peak-normalised Flux",
                        font: {
                            size: 18,
	                    weight: "bold"
                        }
 		    },
		    max: 1,
		    min: 3e-3,
		},
		x: {
                  grid: {
                      color: 'rgb(128,139,150,0.2)',
                  },
                    ticks: {
                        font: {
                               size: 14,
	                       weight: "bold"
                         }
                    },
		    title: {
			display: true,
			text: "Wavelength [micron]",
                        font: {
                            size: 18,
	                    weight: "bold"
                        }
		    }
		}
	    }
        }
    });
}


// function switchYAxisScale():


loadSpectra('static/spec.csv')
    .then(spec => {
	specWlens = spec.shift();
	specVals = spec;
	initializeChart(specWlens);
	console.log("Spectra Loaded.");
  })
  .catch(error => {
    console.error('Error reading the file:', error);
  });
