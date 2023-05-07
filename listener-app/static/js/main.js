let audioContext;
let audioBuffers;
let gainNodes;
let sourceNodes;
let pixCols;
var canvas = document.getElementById('mycanvas');
var ctx = canvas.getContext('2d');

var panelsize = 50;
var npanel = 18;
var fadetime = 0.5;
var maxvol = 0.06

canvas.width  = panelsize * npanel;
canvas.height = panelsize * npanel;

var x = 0;
var y = 0;
var w = 0;

var curdx = -1;
var idx = 0;

var isMouseDown = false;


const setupContextButton = document.querySelector(".setup-context")

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
	    w = Math.floor(panelsize*0.99);
	    ctx.fillRect (x, y, w, w);
	    

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

