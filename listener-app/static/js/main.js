let audioContext;
let audioBuffers;
let gainNodes;
let sourceNodes;
let pixCols;
let specWlens;
let specVals;
let specChart;
let intspecWlens;
let intspecVals;
let intspecChart;
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');

var panelsize = ppix;
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

// Next ~250 lines are for spatial selection in the Viewfinder
//hidden or text inputs for transparent canvas
var image = document.getElementById('fullDatacube');
var imagecanvas = document.getElementById('imageCanvas')
var h_th_left = document.getElementById('thb_left')
var h_th_top = document.getElementById('thb_top')
var h_th_right = document.getElementById('thb_right')
var h_th_bottom = document.getElementById('thb_bottom')

var handleRadius = 10

var dragTL = dragBL = dragTR = dragBR = false;
var dragWholeRect = false;

var rect={}
var current_canvas_rect={}

var mouseX, mouseY
var startX, startY

var th_left = 0;
var th_top = 0;
var th_right = 24;
var th_bottom = 24;

var th_width = th_right - th_left;
var th_height = th_bottom - th_top;

var effective_image_width = 24;
var effective_image_height = 24;


//drawRectInCanvas() connected functions -- START
function updateHiddenInputs(){
  var inverse_ratio_w =  effective_image_width / imageCanvas.width;
  var inverse_ratio_h = effective_image_height / imageCanvas.height ;
  h_th_left.value = Math.round(rect.left * inverse_ratio_w)
  h_th_top.value = Math.round(rect.top * inverse_ratio_h)
  h_th_right.value = Math.round((rect.left + rect.width) * inverse_ratio_w)
  h_th_bottom.value = Math.round((rect.top + rect.height) * inverse_ratio_h)
}

function drawCircle(x, y, radius) {
  var ictx = imageCanvas.getContext("2d");
  ictx.fillStyle = "#ffe657";
  ictx.beginPath();
  ictx.arc(x, y, radius, 0, 2 * Math.PI);
  ictx.fill();
}

function drawHandles() {
  drawCircle(rect.left, rect.top, handleRadius);
  drawCircle(rect.left + rect.width, rect.top, handleRadius);
  drawCircle(rect.left + rect.width, rect.top + rect.height, handleRadius);
  drawCircle(rect.left, rect.top + rect.height, handleRadius);
}

function drawRectInCanvas()
{
  var ictx = imageCanvas.getContext("2d");
  ictx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  ictx.beginPath();
  ictx.lineWidth = "6";
  ictx.fillStyle = "rgba(255, 230, 87, 0.1)";
  ictx.strokeStyle = "#ffe657";
  ictx.rect(rect.left, rect.top, rect.width, rect.height);
  ictx.fill();
  ictx.stroke();
  drawHandles();
  updateHiddenInputs()
}
//drawRectInCanvas() connected functions -- END

function mouseUp(e) {
  dragTL = dragTR = dragBL = dragBR = false;
  dragWholeRect = false;
}

//mousedown connected functions -- START
function checkInRect(x, y, r) {
  return (x>r.left && x<(r.width+r.left)) && (y>r.top && y<(r.top+r.height));
}

function checkCloseEnough(p1, p2) {
  return Math.abs(p1 - p2) < handleRadius;
}

function getMousePos(imageCanvas, evt) {
  var clx, cly
  if (evt.type == "touchstart" || evt.type == "touchmove") {
    clx = evt.touches[0].clientX;
    cly = evt.touches[0].clientY;
  } else {
    clx = evt.clientX;
    cly = evt.clientY;
  }
  var boundingRect = imageCanvas.getBoundingClientRect();
  return {
    x: clx - boundingRect.left,
    y: cly - boundingRect.top
  };
}

function mouseDown(e) {
  var pos = getMousePos(this,e);
  mouseX = pos.x;
  mouseY = pos.y;
  // 0. inside movable rectangle
  if (checkInRect(mouseX, mouseY, rect)){
      dragWholeRect=true;
      startX = mouseX;
      startY = mouseY;
  }
  // 1. top left
  else if (checkCloseEnough(mouseX, rect.left) && checkCloseEnough(mouseY, rect.top)) {
      dragTL = true;
  }
  // 2. top right
  else if (checkCloseEnough(mouseX, rect.left + rect.width) && checkCloseEnough(mouseY, rect.top)) {
      dragTR = true;
  }
  // 3. bottom left
  else if (checkCloseEnough(mouseX, rect.left) && checkCloseEnough(mouseY, rect.top + rect.height)) {
      dragBL = true;
  }
  // 4. bottom right
  else if (checkCloseEnough(mouseX, rect.left + rect.width) && checkCloseEnough(mouseY, rect.top + rect.height)) {
      dragBR = true;
  }
  // (5.) none of them
  else {
      // handle not resizing
  }
  drawRectInCanvas();
}
//mousedown connected functions -- END

function mouseMove(e) {    
  var pos = getMousePos(this,e);
  mouseX = pos.x;
  mouseY = pos.y;
  if (dragWholeRect) {
      e.preventDefault();
      e.stopPropagation();
      dx = mouseX - startX;
      dy = mouseY - startY;
      if ((rect.left+dx)>0 && (rect.left+dx+rect.width)<imageCanvas.width){
        rect.left += dx;
      }
      if ((rect.top+dy)>0 && (rect.top+dy+rect.height)<imageCanvas.height){
        rect.top += dy;
      }
      startX = mouseX;
      startY = mouseY;
  } else if (dragTL) {
      e.preventDefault();
      e.stopPropagation();
      var newSide = (Math.abs(rect.left+rect.width - mouseX)+Math.abs(rect.height + rect.top - mouseY))/2;
      if (newSide>150){
        rect.left = rect.left + rect.width - newSide;
        rect.top = rect.height + rect.top - newSide;
        rect.width = rect.height = newSide;
      }
  } else if (dragTR) {
      e.preventDefault();
      e.stopPropagation();
      var newSide = (Math.abs(mouseX-rect.left)+Math.abs(rect.height + rect.top - mouseY))/2;
      if (newSide>150){
          rect.top = rect.height + rect.top - newSide;
          rect.width = rect.height = newSide;
      }
  } else if (dragBL) {
      e.preventDefault();
      e.stopPropagation();
      var newSide = (Math.abs(rect.left+rect.width - mouseX)+Math.abs(rect.top - mouseY))/2;
      if (newSide>150)
      {
        rect.left = rect.left + rect.width - newSide;
        rect.width = rect.height = newSide;
      }
  } else if (dragBR) {
      e.preventDefault();
      e.stopPropagation();
      var newSide = (Math.abs(rect.left - mouseX)+Math.abs(rect.top - mouseY))/2;
      if (newSide>150)
      {
       rect.width = rect.height = newSide;
      }      
  }
  drawRectInCanvas();
}

function updateCurrentCanvasRect(){
  current_canvas_rect.height = imageCanvas.height
  current_canvas_rect.width = imageCanvas.width
  current_canvas_rect.top = image.offsetTop
  current_canvas_rect.left = image.offsetLeft
}

function repositionCanvas(){
  //make canvas same as image, which may have changed size and position
  imageCanvas.height = image.height;
  imageCanvas.width = image.width;
  imageCanvas.style.top = image.offsetTop + "px";;
  imageCanvas.style.left = image.offsetLeft + "px";
  //compute ratio comparing the NEW canvas rect with the OLD (current)
  var ratio_w = imageCanvas.width / current_canvas_rect.width;
  var ratio_h = imageCanvas.height / current_canvas_rect.height;
  //update rect coordinates
  rect.top = rect.top * ratio_h;
  rect.left = rect.left * ratio_w;
  rect.height = rect.height * ratio_h;
  rect.width = rect.width * ratio_w;
  updateCurrentCanvasRect();
  drawRectInCanvas();
}

function initCanvas(){
  imageCanvas.height = image.height;
  imageCanvas.width = image.width;
  imageCanvas.style.top = image.offsetTop + "px";;
  imageCanvas.style.left = image.offsetLeft + "px";
  updateCurrentCanvasRect();
}

function initRect(){
  var ratio_w = imageCanvas.width / effective_image_width;
  var ratio_h = imageCanvas.height / effective_image_height;
  //BORDER OF SIZE 6!
  rect.height = th_height*ratio_h-6
  rect.width = th_width*ratio_w-6
  rect.top = th_top*ratio_h+3
  rect.left = th_left*ratio_w+3
}

function init(){
  imageCanvas.addEventListener('mousedown', mouseDown, false);
  imageCanvas.addEventListener('mouseup', mouseUp, false);
  imageCanvas.addEventListener('mousemove', mouseMove, false);
  imageCanvas.addEventListener('touchstart', mouseDown);
  imageCanvas.addEventListener('touchmove', mouseMove);
  imageCanvas.addEventListener('touchend', mouseUp);
  initCanvas();
  initRect();
  drawRectInCanvas();
}

window.addEventListener('load',init)
window.addEventListener('resize',repositionCanvas)


//// -------- collapsible block (for Set Parameters) --------

var coll = document.getElementsByClassName("collapsible");
var i;
for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
} 

var isMouseDown = false;
var isYAxisLog = false;
var isDarkMode = false;
var isContextSetUp = false;
var useHelperSounds = false;
var showNewFile = false;

// some colours
var dmline = "rgb(255,255,0)"
var dmgrid = "rgb(255,255,255,0.25)"
var dmfont = "rgb(255,255,255,0.7)"
var lmline = "rgb(0,0,0)"
var lmgrid = "rgb(0,0,0,0.25)"
var lmfont = "rgb(0,0,0,0.7)"
var midgry = "rgb(115,115,115)"

const setupContextButton = document.querySelector(".setup-context")
const switchYAxisButton = document.querySelector(".switch-axis")
const switchShowNewButton = document.querySelector(".show-new")
const switchDarkModeButton = document.querySelector(".dark-mode")
const switchHelperButton = document.querySelector(".helper-switch")
const oobNotification = document.getElementById("oob-sound")


// ---------- load integrated spectrum -----------------

function loadSpectrum(filePath) {
  return new Promise((resolve, reject) => {
    fetch(filePath)
      .then(response => response.text())
      .then(data => {
          const lines = data.trim().split("\n");
	  const numbersArray = lines.map(line => line.split(',').map(parseFloat));
	  resolve(numbersArray);
      })
      .catch(error => reject(error));
  });
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


// ---------- toggle select new section -----------------

function toggle_display(){
  el = document.querySelector('.generate');
  
  if(el.style.display == 'none'){
      el.style.display = 'block'
  }else{
     el.style.display = 'none'
  }
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
	intspecChart.options.scales.y.type = 'linear';
	isYAxisLog = false;
	switchYAxisButton.innerHTML = 'Use Log Y Scale';
	console.log("Y-axis --> Linear scale.");
    }
    else {
	specChart.options.scales.y.type = 'logarithmic';
	intspecChart.options.scales.y.type = 'logarithmic';
	isYAxisLog = true;
	switchYAxisButton.innerHTML = 'Use Linear Y Scale';
	console.log("Y-axis --> Log scale.");
    }
    specChart.update();
    intspecChart.update();

});

switchDarkModeButton.addEventListener("click", () => {
    if (isDarkMode){
        var element = document.body;
        element.classList.toggle("dark-mode");
        localStorage.setItem("darkmode", "light");
	isDarkMode = false;
	switchDarkModeButton.innerHTML = 'Use Dark Mode';
	
	// change set colours
	specChart.data.datasets[0].borderColor = lmline;
	specChart.options.scales.y.grid.color = lmgrid;
	specChart.options.scales.x.grid.color = lmgrid;
	specChart.options.scales.y.ticks.color = lmfont;
	specChart.options.scales.x.ticks.color = lmfont;
	intspecChart.data.datasets[0].borderColor = lmline;
	intspecChart.options.scales.y.grid.color = lmgrid;
	intspecChart.options.scales.x.grid.color = lmgrid;
	intspecChart.options.scales.y.ticks.color = lmfont;
	intspecChart.options.scales.x.ticks.color = lmfont;
	
	console.log("Light Mode.");
    }
    else {
        var element = document.body;
        element.classList.toggle("dark-mode");
        localStorage.setItem("darkmode", "dark");
	isDarkMode = true;
	switchDarkModeButton.innerHTML = 'Use Light Mode';

	// change set colours
	specChart.options.scaleFontColor = dmfont;
	specChart.data.datasets[0].borderColor = dmline;
	specChart.options.scales.y.grid.color = dmgrid;
	specChart.options.scales.x.grid.color = dmgrid;
	specChart.options.scales.y.ticks.color = dmfont;
	specChart.options.scales.x.ticks.color = dmfont;
	intspecChart.options.scaleFontColor = dmfont;
	intspecChart.data.datasets[0].borderColor = dmline;
	intspecChart.options.scales.y.grid.color = dmgrid;
	intspecChart.options.scales.x.grid.color = dmgrid;
	intspecChart.options.scales.y.ticks.color = dmfont;
	intspecChart.options.scales.x.ticks.color = dmfont;

	console.log("Dark Mode.");
    }
    // update chart
    specChart.update();
    intspecChart.update();

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

//function showCoordinates(e) {
//  var acanvas = $('#mainCanvas').get(0);
//  var ctx = acanvas.getContext('2d');
//  var x = e.pageX - acanvas.offsetLeft;
//  var y = e.pageY - acanvas.offsetTop;
//  var str = 'x : ' + x + ', ' + 'y : ' + y;
//  document.getElementById('ex').innerHTML = str;
//}

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

const mainCanvas = document.getElementById('mainCanvas');
mainCanvas.addEventListener('mousedown', playSound);
mainCanvas.addEventListener('mouseup', stopSoundUp);
mainCanvas.addEventListener('mouseleave', stopSoundLeave);
mainCanvas.addEventListener('mousemove', updateSound);
//mainCanvas.addEventListener('mousemove', showCoordinates);
mainCanvas.addEventListener('mouseenter', enterCanvas);

oobNotification.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
}, false);


// Initialize integrated spectrum Chart.js

var chartcanvas = document.getElementById('integratedChart');
function intChart(intspecWlens, intspecVals) {
    const ctx = document.getElementById('integratedChart').getContext('2d');
//    const initArray = new Array(wlensArray.length).fill(0);
    Chart.defaults.color = midgry;
    intspecChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: intspecWlens, // Create labels based on array indices
            datasets: [{
                label: 'Integrated Spectrum',
                data: intspecVals,
                borderColor: midgry,
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
                      color: lmgrid,
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
                            size: 16,
	                    weight: "bold"
                        }
 		    },
//		    max: 1.01,
//		    min: 3e-3,
		},
		x: {
                  grid: {
                      color: lmgrid,
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
                            size: 16,
	                    weight: "bold"
                        }
		    }
		}
	    }
        }
    });
}

var chartcanvas = document.getElementById('mainChart');

// Initialize Chart.js
function initializeChart(wlensArray) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const initArray = new Array(wlensArray.length).fill(0);
    Chart.defaults.color = midgry;
    specChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: wlensArray, // Create labels based on array indices
            datasets: [{
                label: 'Spectral Dimension',
                data: initArray,
                borderColor: midgry,
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
                      color: lmgrid,
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
                            size: 16,
	                    weight: "bold"
                        }
 		    },
		    max: 1.01,
		    min: 4.5e-4,
		},
		x: {
                  grid: {
                      color: lmgrid,
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
                            size: 16,
	                    weight: "bold"
                        }
		    }
		}
	    }
        }
    });
}


// function switchYAxisScale():

// Load integrated spectrum

loadSpectrum('static/intspec.csv')
    .then(intspec => {
	intspecWlens = intspec.shift();
	intspecVals = intspec[0];
	intChart(intspecWlens, intspecVals);
	console.log(intspecVals);
	console.log("Spectrum Loaded.");
    })
    .catch(error => {
      console.error('Error reading the file:', error);
    });
  
// Load spectra:

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
