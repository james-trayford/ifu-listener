// Draggable rectangle over Viewfinder for selection of spatial region

var image = document.getElementById('fullDatacube');
var imagecanvas = document.getElementById('imageCanvas');
var h_th_left = document.getElementById('thb_left');
var h_th_top = document.getElementById('thb_top');
var h_th_right = document.getElementById('thb_right');
var h_th_bottom = document.getElementById('thb_bottom');

var handleRadius = 10;

var dragTL = dragBL = dragTR = dragBR = false;
var dragWholeRect = false;

var rect={};
var current_canvas_rect={};

var mouseX, mouseY;
var startX, startY;

// The margin size around the image - gives space for rect + handles
var icmargin = 5;
var icmargin2 = icmargin * 2;
var icborder = 0;

//var th_left = 0;
//var th_top = 0;
//var th_right = 100;
//var th_bottom = 100.;

if (!localStorage.thb_left || localStorage.thb_left > 100) {
  localStorage.thb_left = 0;
}
if (!localStorage.thb_top || localStorage.thb_top > 100) {
  localStorage.thb_top = 0;
}
if (!localStorage.thb_right || localStorage.thb_right > 100) {
  localStorage.thb_right = 100;
}
if (!localStorage.thb_bottom || localStorage.thb_bottom > 100) {
  localStorage.thb_bottom = 100;
}

//let file_select = document.getElementById("form.file");
//file_select.onchange = function(){
//  localStorage.thb_left = 0;
//  localStorage.thb_top = 0;
//  localStorage.thb_right = 100;
//  localStorage.thb_bottom = 100;
//  drawRectInCanvas();
//};

var th_left = localStorage.thb_left;
var th_top = localStorage.thb_top;
var th_right = localStorage.thb_right;
var th_bottom = localStorage.thb_bottom;

var th_width = th_right - th_left;
var th_height = th_bottom - th_top;

var effective_image_width = 100.;
var effective_image_height = 100.;

var drag_colours = localStorage.drag_rgb;

//drawRectInCanvas() connected functions -- START
function updateHiddenInputs(){
  var inverse_ratio_w =  effective_image_width / imageCanvas.width;
  var inverse_ratio_h = effective_image_height / imageCanvas.height;
  h_th_left.value = Math.round(Math.max(rect.left-icmargin,0) * inverse_ratio_w);
  h_th_top.value = Math.round(Math.max(rect.top-icmargin,0) * inverse_ratio_h);
  h_th_right.value = Math.round((rect.left + rect.width + icmargin) * inverse_ratio_w);
  h_th_bottom.value = Math.round((rect.top + rect.height + icmargin) * inverse_ratio_h);
  localStorage.setItem('thb_left', h_th_left.value);
  localStorage.setItem('thb_top', h_th_top.value);
  localStorage.setItem('thb_right', h_th_right.value);
  localStorage.setItem('thb_bottom', h_th_bottom.value);
}

function drawCircle(x, y, radius) {
  var ictx = imageCanvas.getContext("2d");
  var drag_col = localStorage.getItem("drag_colours");
  ictx.fillStyle = drag_col;
  ictx.beginPath();
  ictx.arc(x, y, radius, 0, 2 * Math.PI);
  ictx.fill();
}

function drawSquare(x,y, side) {
  var ictx = imageCanvas.getContext("2d");
  var drag_col = localStorage.getItem("drag_colours");
  ictx.fillStyle = drag_col;
  ictx.fillRect(x,y,side,side);
}

function drawHandles() {
  drawSquare(rect.left-handleRadius, rect.top-handleRadius, handleRadius);
  drawSquare(rect.left + rect.width, rect.top-handleRadius, handleRadius);
  drawSquare(rect.left + rect.width, rect.top + rect.height, handleRadius);
  drawSquare(rect.left-handleRadius, rect.top + rect.height, handleRadius);
}

function drawRectInCanvas()
{
  var ictx = imageCanvas.getContext("2d");
  var drag_col = localStorage.getItem("drag_colours");
  ictx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  ictx.beginPath();
  ictx.lineWidth = "4";
  ictx.fillStyle = "rgba(76, 187, 23, 0.1)";
  console.log("view: " + drag_col);
  ictx.strokeStyle = drag_col;
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
  return Math.abs(p1 - p2) < 2*handleRadius;
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
  // mouseX = Math.min(Math.max(pos.x, imageCanvas.width-icmargin), icmargin);
  // mouseY = Math.min(Math.max(pos.y, imageCanvas.height-icmargin), icmargin);
  mouseX = pos.x;
  mouseY = pos.y;    
  //console.log(`X: ${mouseX} | Y: ${mouseY}`);  
  if (dragWholeRect) {
      e.preventDefault();
      e.stopPropagation();
      dx = mouseX - startX;
      dy = mouseY - startY;
      if ((rect.left+dx)>icmargin && (rect.left+dx+rect.width+icmargin)<imageCanvas.width){
        rect.left += dx;
      }
      if ((rect.top+dy)>icmargin && (rect.top+dy+rect.height+icmargin)<imageCanvas.height){
        rect.top += dy;
      }
      startX = mouseX;
      startY = mouseY;
  } else if (dragTL) {
      e.preventDefault();
      e.stopPropagation();
      // var newSide = (Math.abs(rect.left+rect.width - Math.max(mouseX, icmargin)) +
      // 		     Math.abs(rect.height + rect.top - Math.max(mouseY, icmargin)))/2;
      var deltaSide = Math.min(Math.max(rect.left - mouseX, rect.top - mouseY),
			       Math.min(rect.left, rect.top) - icmargin);
      var newSide = rect.width + deltaSide;
      // newSide =  Math.min(Math.min(Math.newSide - rect.width, rect.left-icmargin), Math.newSide - rect.width)
      if (newSide>5){
        rect.left = rect.left + rect.width - newSide;
        rect.top = rect.height + rect.top - newSide;
        rect.width = rect.height = newSide;
      }
  } else if (dragTR) {
      e.preventDefault();
      e.stopPropagation();
      // var newSide = (Math.abs(Math.min(mouseX, imageCanvas.width - icmargin)-rect.left)+
      // 		     Math.abs(rect.height + rect.top - Math.max(mouseY, icmargin)))/2;
      var deltaSide = Math.min(Math.max(mouseX - (rect.left+rect.width), rect.top - mouseY),
			       Math.min(imageCanvas.width-(rect.left+rect.width), rect.top) - icmargin);
      var newSide = rect.width + deltaSide;
      if (newSide>5){
          rect.top = rect.height + rect.top - newSide;
          rect.width = rect.height = newSide;
      }
  } else if (dragBL) {
      e.preventDefault();
      e.stopPropagation();
      var deltaSide = Math.min(Math.max(rect.left - mouseX, mouseY - (rect.top+rect.height)),
			       Math.min(rect.left, imageCanvas.height - (rect.top+rect.height)) - icmargin);
      var newSide = rect.width + deltaSide;
      // var newSide = (Math.abs(rect.left+rect.width - mouseX)+Math.abs(rect.top - mouseY))/2;
      if (newSide>5)
      {
        rect.left = rect.left + rect.width - newSide;
        rect.width = rect.height = newSide;
      }
  } else if (dragBR) {
      e.preventDefault();
      e.stopPropagation();
      var deltaSide = Math.min(Math.max(mouseX - (rect.left+rect.width), mouseY - (rect.top+rect.height)),
			       Math.min(imageCanvas.width-(rect.left+rect.width), imageCanvas.height - (rect.top+rect.height)) - icmargin);
      var newSide = rect.width + deltaSide;
      // var newSide = (Math.abs(rect.left - mouseX)+Math.abs(rect.top - mouseY))/2;
      if (newSide>5)
      {
       rect.width = rect.height = newSide;
      }      
  }
  drawRectInCanvas();
}

function updateCurrentCanvasRect(){
    current_canvas_rect.height = imageCanvas.height - icmargin2*2 + icborder *4;
    current_canvas_rect.width = imageCanvas.width - icmargin2*2 + icborder *4;
    current_canvas_rect.top = imageCanvas.offsetTop + icmargin;
    current_canvas_rect.left = imageCanvas.offsetLeft + icmargin;
}

function repositionCanvas(){
  //make canvas same as image, which may have changed size and position
  imageCanvas.height = image.height+icmargin2;
  imageCanvas.width = image.width+icmargin2;
  imageCanvas.style.top = image.offsetTop + icborder - icmargin + "px";
  imageCanvas.style.left = image.offsetLeft + icborder - icmargin + "px";
  //compute ratio comparing the NEW canvas rect with the OLD (current)
  var ratio_w = imageCanvas.width / current_canvas_rect.width;
  var ratio_h = imageCanvas.height / current_canvas_rect.height;
  //update rect coordinates
  rect.top = 0+icmargin;
  rect.left = 0+icmargin;
  rect.height = image.height;
  rect.width = image.width;
  updateCurrentCanvasRect();
  drawRectInCanvas();
}

function initCanvas(){
  imageCanvas.height = image.height - icborder;
  imageCanvas.width = image.width - 2*icborder;
  imageCanvas.style.top = image.offsetTop + icborder + "px";
  imageCanvas.style.left = image.offsetLeft + icborder + "px";
  updateCurrentCanvasRect();
}

function initRect(){
  var ratio_w = imageCanvas.width / effective_image_width;
  var ratio_h = imageCanvas.height / effective_image_height;
  // Align with inset image
  rect.height = th_height*ratio_h-icmargin2
  rect.width = th_width*ratio_w-icmargin2
  rect.top = th_top*ratio_h+icmargin
  rect.left = th_left*ratio_w+icmargin
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

window.addEventListener('load',init);
window.addEventListener('resize',repositionCanvas);

