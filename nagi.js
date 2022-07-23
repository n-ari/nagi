const WIDTH = 1080;
const HEIGHT = 360;
const BAR_WIDTH = 1;

// ref: https://kray.jp/blog/web-audio-api-audio-visualizer/

// stft analyser
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
analyser.connect(audioContext.destination);
function updateFftSize(){
  analyser.fftSize = parseInt(document.getElementById("fftSize").value);
}

// render func
let renderingId = -1;
let frameCnt = 0;
function render(id){
  if (renderingId !== id) return;

  // canvas
  const cvs = document.getElementById("nagiDrawer");
  const ctx = cvs.getContext("2d");

  // load spectrum
  updateFftSize();
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(spectrum);

  // throttle
  const SPAN = parseInt(document.getElementById("renderSpan").value);
  if (frameCnt > 0) {
    if (frameCnt > SPAN) frameCnt = SPAN;
    frameCnt -= 1;
    requestAnimationFrame(() => {render(id);});
    return;
  }
  frameCnt = SPAN - 1;

  // shift contents to right/left
  // ref: https://stackoverflow.com/questions/8376534/shift-canvas-contents-to-the-left
  ctx.globalCompositeOperation = "copy";
  const shiftToLeft = document.getElementById("shiftToLeft").checked;
  if (shiftToLeft){
    ctx.drawImage(ctx.canvas, -BAR_WIDTH, 0);
  } else {
    ctx.drawImage(ctx.canvas, BAR_WIDTH, 0);
  }
  ctx.globalCompositeOperation = "source-over";

  // draw spectrum bar
  const len = spectrum.length;
  const unit = HEIGHT / len;
  for (let i=0; i<len; ++i){
    // value to color
    let value = spectrum[i];
    if (document.getElementById("brighterToZero").checked){
      value = 255 - value;
    }
    value *= parseFloat(document.getElementById("colorCoeffScale").value);
    value += parseFloat(document.getElementById("colorCoeffOffset").value);
    value = (Math.min(255, Math.max(0, value))) ^ 0;

    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(shiftToLeft ? WIDTH - BAR_WIDTH : 0, HEIGHT - unit * (i + 1), BAR_WIDTH, unit);
  }

  requestAnimationFrame(() => {render(id);});
}

let playingSource = null;
function startNagi(){
  // file reader
  const fileReader = new FileReader();
  fileReader.addEventListener("load", () => {
    audioContext.decodeAudioData(fileReader.result, (buffer)=>{
      // stop last thread
      stopNagi();

      // play
      playingSource = audioContext.createBufferSource();
      playingSource.buffer = buffer;
      playingSource.connect(analyser);
      playingSource.start(0, parseFloat(document.getElementById("startPos").value));

      // start render
      renderingId = Math.random();
      requestAnimationFrame(() => {render(renderingId);});
    });
  });
  fileReader.readAsArrayBuffer(document.getElementById("nagiLoader").files[0]);
}

function stopNagi(){
  if (playingSource){
    playingSource.stop();
    playingSource.disconnect();
    playingSource = null;
    cancelAnimationFrame(renderingId);
    renderingId = -1;
  }
}
