(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var AudioContext = window.AudioContext || window.webkitAudioContext

function createWorker (fn) {
  var js = fn
    .toString()
    .replace(/^function\s*\(\)\s*{/, '')
    .replace(/}$/, '')
  var blob = new Blob([js])
  return new Worker(URL.createObjectURL(blob))
}

function error (method) {
  var event = new Event('error')
  event.data = new Error('Wrong state for ' + method)
  return event
}

var context

/**
 * Audio Recorder with MediaRecorder API.
 *
 * @param {MediaStream} stream The audio stream to record.
 *
 * @example
 * navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
 *   var recorder = new MediaRecorder(stream)
 * })
 *
 * @class
 */
function MediaRecorder (stream) {
  /**
   * The `MediaStream` passed into the constructor.
   * @type {MediaStream}
   */
  this.stream = stream

  /**
   * The current state of recording process.
   * @type {"inactive"|"recording"|"paused"}
   */
  this.state = 'inactive'

  this.em = document.createDocumentFragment()
  this.encoder = createWorker(MediaRecorder.encoder)

  var recorder = this
  this.encoder.addEventListener('message', function (e) {
    var event = new Event('dataavailable')
    event.data = new Blob([e.data], { type: recorder.mimeType })
    recorder.em.dispatchEvent(event)
    if (recorder.state === 'inactive') {
      recorder.em.dispatchEvent(new Event('stop'))
    }
  })
}

MediaRecorder.prototype = {
  /**
   * The MIME type that is being used for recording.
   * @type {string}
   */
  mimeType: 'audio/wav',

  /**
   * Begins recording media.
   *
   * @param {number} [timeslice] The milliseconds to record into each `Blob`.
   *                             If this parameter isn’t included, single `Blob`
   *                             will be recorded.
   *
   * @return {undefined}
   *
   * @example
   * recordButton.addEventListener('click', function () {
   *   recorder.start()
   * })
   */
  start: function start (timeslice) {
    if (this.state !== 'inactive') {
      return this.em.dispatchEvent(error('start'))
    }

    this.state = 'recording'

    if (!context) {
      context = new AudioContext()
    }
    var input = context.createMediaStreamSource(this.stream)
    var processor = context.createScriptProcessor(2048, 1, 1)

    var recorder = this
    processor.onaudioprocess = function (e) {
      if (recorder.state === 'recording') {
        recorder.encoder.postMessage([
          'encode', e.inputBuffer.getChannelData(0)
        ])
      }
    }

    input.connect(processor)
    processor.connect(context.destination)

    this.em.dispatchEvent(new Event('start'))

    if (timeslice) {
      this.slicing = setInterval(function () {
        if (recorder.state === 'recording') recorder.requestData()
      }, timeslice)
    }

    return undefined
  },

  /**
   * Stop media capture and raise `dataavailable` event with recorded data.
   *
   * @return {undefined}
   *
   * @example
   * finishButton.addEventListener('click', function () {
   *   recorder.stop()
   * })
   */
  stop: function stop () {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('stop'))
    }

    this.requestData()
    this.state = 'inactive'
    return clearInterval(this.slicing)
  },

  /**
   * Pauses recording of media streams.
   *
   * @return {undefined}
   *
   * @example
   * pauseButton.addEventListener('click', function () {
   *   recorder.pause()
   * })
   */
  pause: function pause () {
    if (this.state !== 'recording') {
      return this.em.dispatchEvent(error('pause'))
    }

    this.state = 'paused'
    return this.em.dispatchEvent(new Event('pause'))
  },

  /**
   * Resumes media recording when it has been previously paused.
   *
   * @return {undefined}
   *
   * @example
   * resumeButton.addEventListener('click', function () {
   *   recorder.resume()
   * })
   */
  resume: function resume () {
    if (this.state !== 'paused') {
      return this.em.dispatchEvent(error('resume'))
    }

    this.state = 'recording'
    return this.em.dispatchEvent(new Event('resume'))
  },

  /**
   * Raise a `dataavailable` event containing the captured media.
   *
   * @return {undefined}
   *
   * @example
   * this.on('nextData', function () {
   *   recorder.requestData()
   * })
   */
  requestData: function requestData () {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('requestData'))
    }

    return this.encoder.postMessage(['dump', context.sampleRate])
  },

  /**
   * Add listener for specified event type.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The listener function.
   *
   * @return {undefined}
   *
   * @example
   * recorder.addEventListener('dataavailable', function (e) {
   *   audio.src = URL.createObjectURL(e.data)
   * })
   */
  addEventListener: function addEventListener () {
    this.em.addEventListener.apply(this.em, arguments)
  },

  /**
   * Remove event listener.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The same function used in `addEventListener`.
   *
   * @return {undefined}
   */
  removeEventListener: function removeEventListener () {
    this.em.removeEventListener.apply(this.em, arguments)
  },

  /**
   * Calls each of the listeners registered for a given event.
   *
   * @param {Event} event The event object.
   *
   * @return {boolean} Is event was no canceled by any listener.
   */
  dispatchEvent: function dispatchEvent () {
    this.em.dispatchEvent.apply(this.em, arguments)
  }
}

/**
 * Returns `true` if the MIME type specified is one the polyfill can record.
 *
 * This polyfill supports only `audio/wav`.
 *
 * @param {string} mimeType The mimeType to check.
 *
 * @return {boolean} `true` on `audio/wav` MIME type.
 */
MediaRecorder.isTypeSupported = function isTypeSupported (mimeType) {
  return /audio\/wave?/.test(mimeType)
}

/**
 * `true` if MediaRecorder can not be polyfilled in the current browser.
 * @type {boolean}
 *
 * @example
 * if (MediaRecorder.notSupported) {
 *   showWarning('Audio recording is not supported in this browser')
 * }
 */
MediaRecorder.notSupported = !navigator.mediaDevices || !AudioContext

/**
 * Converts RAW audio buffer to compressed audio files.
 * It will be loaded to Web Worker.
 * By default, WAVE encoder will be used.
 * @type {function}
 *
 * @example
 * MediaRecorder.prototype.mimeType = 'audio/ogg'
 * MediaRecorder.encoder = oggEncoder
 */
MediaRecorder.encoder = require('./wave-encoder')

module.exports = MediaRecorder

},{"./wave-encoder":2}],2:[function(require,module,exports){
// Copied from https://github.com/chris-rudmin/Recorderjs

module.exports = function () {
  var BYTES_PER_SAMPLE = 2

  var recorded = []

  function encode (buffer) {
    var length = buffer.length
    var data = new Uint8Array(length * BYTES_PER_SAMPLE)
    for (var i = 0; i < length; i++) {
      var index = i * BYTES_PER_SAMPLE
      var sample = buffer[i]
      if (sample > 1) {
        sample = 1
      } else if (sample < -1) {
        sample = -1
      }
      sample = sample * 32768
      data[index] = sample
      data[index + 1] = sample >> 8
    }
    recorded.push(data)
  }

  function dump (sampleRate) {
    var bufferLength = recorded.length ? recorded[0].length : 0
    var length = recorded.length * bufferLength
    var wav = new Uint8Array(44 + length)
    var view = new DataView(wav.buffer)

    // RIFF identifier 'RIFF'
    view.setUint32(0, 1380533830, false)
    // file length minus RIFF identifier length and file description length
    view.setUint32(4, 36 + length, true)
    // RIFF type 'WAVE'
    view.setUint32(8, 1463899717, false)
    // format chunk identifier 'fmt '
    view.setUint32(12, 1718449184, false)
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (raw)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, 1, true)
    // sample rate
    view.setUint32(24, sampleRate, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, BYTES_PER_SAMPLE, true)
    // bits per sample
    view.setUint16(34, 8 * BYTES_PER_SAMPLE, true)
    // data chunk identifier 'data'
    view.setUint32(36, 1684108385, false)
    // data chunk length
    view.setUint32(40, length, true)

    for (var i = 0; i < recorded.length; i++) {
      wav.set(recorded[i], i * bufferLength + 44)
    }

    recorded = []
    postMessage(wav.buffer, [wav.buffer])
  }

  onmessage = function (e) {
    if (e.data[0] === 'encode') {
      encode(e.data[1])
    } else {
      dump(e.data[1])
    }
  }
}

},{}],3:[function(require,module,exports){

// global variable for storing local variables 
const STATE = {};

let msg_box = document.getElementById('msg_box');
let button = document.getElementById('button');
let canvas = document.getElementById('canvas');
let messages = {
        'mic_error': 'Error accessing the microphone', 
        'press_to_start': 'Click above to begin recording', 
        'recording': 'Recording', 
        'play': 'Play', 
        'stop': 'Stop',
        'download': 'Download recording', 
        'use_https': 'This application will not work over an insecure connection. Use HTTPS.',
        'not_supported_in_safari_or_edge': 'Score Search is not yet supported in Safari or Edge. Please use Chrome or Firefox instead'
    },
time;

$('#msg_box').text(messages.press_to_start);

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

let recorder;
let safariRecorder;
let gumStream;
let btn_status = 'inactive';
let audio = new Audio();

if (navigator.mediaDevices.getUserMedia) {

    if (window.webkitAudioContext) {
        $('#msg_box').text(messages.not_supported_in_safari_or_edge);
        $('.auth-links-region').css('display', 'none'); 
        $('.record_btn').css('display', 'none');
    }

    let AudioContext = window.AudioContext || window.webkitAudioContext || false; 

    button.onclick = function () {
        if (btn_status === 'inactive' ) {
            beginRecording();
        } else if ( btn_status === 'recording') {
            stopRecording();
        }
    }

    function beginRecording() {
        console.log('beginning the recording');
        $('.past-search-region').prop('hidden', true);
        $('.api-results').prop('hidden', true);
        $('.authentication-region').prop('hidden', true);
        $('.auth-links-region').prop('hidden', true);
        $('.usage-details').prop('hidden', true);
        $('.instructions').prop('hidden', true);
        $('.sheet-music-message').remove();

        button.classList.add('recording');
        btn_status = 'recording';

        $('#msg_box').text(messages.recording);

        time = Math.ceil( new Date().getTime() / 1000 );

      // if (AudioContext === window.webkitAudioContext) {

      //   console.log('hi!')

      //     // safari/edge mediarecorder polyfill
      //     window.MediaRecorder = require('audio-recorder-polyfill')
      //     // MediaRecorder.encoder = require('./ogg-opus-encoder')
      //     // MediaRecorder.mimeType = 'audio/ogg'

      //     if (MediaRecorder.notSupported) {
      //       noSupport.style.display = 'block';
      //       dictaphone.style.display = 'none';
      //     }

      //     // Request permissions to record audio
      //     navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    
      //       safariRecorder = new MediaRecorder(stream);

      //       console.log('stream')

      //       // Set record to <audio> when recording will be finished
      //       safariRecorder.addEventListener('dataavailable', e => {

      //         console.log(e)

      //         audioSrc = window.URL.createObjectURL(e.data);

      //         audio.src = audioSrc;

      //         let auddDiv = document.getElementById('audd-div');
      //         let audd = document.createElement('audio');
      //         audd.src = (audioSrc);
      //         audd.controls = 'controls';

      //         console.log(audd, auddDiv)

      //         auddDiv.appendChild(audd)
      //         // POSTreq(e.data);
      //       })

      //       // Start recording
      //       safariRecorder.start();

      //       // safariRecorder.onstop = function () {
      //       //   safariRecorder.stream.getTracks().forEach( function( track ) { track.stop() } );


      //       //   audioSrc = window.URL.createObjectURL(e.data);
      //       //   audio.src = audioSrc;
      //       //   POSTreq(e.data);


      //       //   // console.log('data is being stopped');
      //       //   // blob = new Blob( chunks, {type: 'audio/webm'});
      //       //   // console.log(blob.type);
      //       //   // audioSrc = window.URL.createObjectURL( blob );
      //       //   // console.log('blob type is', blob.type);
      //       //   // console.log('audioSrc is', audioSrc);
      //       //   // audio.src = audioSrc;
      //       //   // console.log('chunks is', chunks);
      //       //   // console.log(chunks.blob);
      //       //   // uploadBlob(chunks);
      //       //   // chunks = [];
      //       // }
      //     })
      // }

      // else {

        // console.log('this should fire in chrome/firefox')

        navigator.mediaDevices.getUserMedia({ 'audio': true })
        .then(function(stream) {

          console.log(stream)

            // button.classList.add('recording');
            // btn_status = 'recording';

            // $('#msg_box').text(messages.recording);

            // time = Math.ceil( new Date().getTime() / 1000 );


            // if (AudioContext === window.webkitAudioContext) {
            //     let audioCtx = new AudioContext;
            //     gumStream = stream;
            //     let source = audioCtx.createMediaStreamSource(stream);
            //     recorder = new WebAudioRecorder(source, {
            //         workerDir: 'web_audio_recorder_js/',
            //         // must use mp3 to work with Safari, but chrome/firefox accept ogg
            //         encoding: 'mp3'
            //     });
            // }

            if (AudioContext) {
                console.log(AudioContext)
                let audioCtx = new AudioContext;
                gumStream = stream;
                let source = audioCtx.createMediaStreamSource(stream);
                recorder = new WebAudioRecorder(source, {
                    workerDir: 'web_audio_recorder_js/',
                    // must use mp3 to work with Safari, but chrome/firefox accept ogg
                    encoding: 'ogg'
                });
            } 
            else {
                alert('The Web Audio API is not supported.');
            }

            recorder.setOptions({
                timeLimit: 120,
                encodeAfterRecord: true,
                ogg: {quality: 0.9},
                mp3: {bitRate: 320}
            });

            recorder.startRecording();

            recorder.onComplete = function(recorder, blob) {
              console.log(blob)
                audioSrc = window.URL.createObjectURL(blob);
                audio.src = audioSrc;
                POSTreq(blob);
            }

            recorder.onError = function(recorder, err) {
                console.error(err);
            }

        })
        .catch(function(err) {
            console.error(err);
            if (location.protocol != 'https:') {
                $('#msg_box').text(`${messages.mic_error} 
                                    ${messages.use_https}`);
            } 
            else {
                $('#msg_box').text(messages.mic_error); 
            }
        button.disabled = true;
        })
      // }
    }

    // button.onclick = function () {
    //     if (btn_status === 'inactive' ) {
    //         beginRecording();
    //     } else if ( btn_status === 'recording') {
    //         stopRecording();
    //     }
    // }

    function parseTime( sec ) {
        var h = parseInt( sec / 3600 );
        var m = parseInt( sec / 60 );
        var sec = sec - ( h * 3600 + m * 60 );

        h = h == 0 ? '' : h + ':';
        sec = sec < 10 ? '0' + sec : sec;

        return h + m + ':' + sec; 
    }

function stopRecording() {
  console.log('stopping the recording');
  // only applies to the regular recorder
  // let recordingTime = recorder.recordingTime();
  $('.auth-links-region').prop('hidden', false);
  if (localStorage.getItem('authToken')) {
    $('.authentication-region').prop('hidden', false);
    $('.auth-links-region').prop('hidden', true);
  }
  $('.usage-details').prop('hidden', false);

  button.classList.remove('recording');
  btn_status = 'inactive';

  $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="ui-link txt_btn">${messages.play} (${t})</a><br>
                            <a href="#" onclick="save(); return false;" class="ui-link txt_btn">${messages.download}</a>`);

  var now = Math.ceil( new Date().getTime() / 1000 );
  var t = parseTime( now - time );

  // if (AudioContext === window.webkitAudioContext) {
  //   // Stop recording
  //   safariRecorder.stop()
  //   // console.log('safari')
  //   // Remove “recording” icon from browser tab
  //   safariRecorder.stream.getTracks().forEach(track => track.stop())
  // }

  // else {
    let audioTrack = gumStream.getAudioTracks()[0];

    audioTrack.stop();

    recorder.finishRecording();
  // }

  

  $('#msg_box').html(`<a id="play-link" href="#" class="ui-link txt_btn">${messages.play} (${t})</a><br>
                            <a id="save-link" href="#" class="ui-link txt_btn">${messages.download}</a>`);
  console.log('recording stopped');
  $('body').on('click', '#play-link', function(e){
    playTrack();
    return false;
  })
  $('body').on('click', '#save-link', function(e){
    saveTrack();
    return false;
  })
}

function playTrack() {
    audio.play();
    console.log('playy')
    $('#msg_box').html(`<a id="pause-link" href="#" class="ui-link txt_btn">${messages.stop}</a><br>
                        <a id="save-link" href="#" class="ui-link txt_btn">${messages.download}</a>`);

  $('body').on('click', '#pause-link', function(e){
    pauseTrack();
    return false;
  })
  $('body').on('click', '#save-link', function(e){
    saveTrack();
    return false;
  })
}

function pauseTrack() {
    audio.pause();
    audio.currentTime = 0;
    $('#msg_box').html(`<a id="play-link" href="#" class="ui-link txt_btn">${messages.play}</a><br>
                        <a id="save-link" href="#" class="ui-link txt_btn">${messages.download}</a>`);
  $('body').on('click', '#play-link', function(e){
      playTrack();
      return false;
  })
  $('body').on('click', '#save-link', function(e){
      playTrack();
      return false;
  })
}

function POSTreq (blobData) {
  var xhr = new XMLHttpRequest();
  var fd = new FormData();
  fd.append('api_token', '3e4055eb4b85f55e5681bbbf894e25f4');
  fd.append('file', blobData);
  fd.append('method', 'recognize');
  fd.append('return_itunes_audios', true);
  fd.append('itunes_country', 'us');

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      parseRetrievedData(xhr.response);
    }
  }
  xhr.open('POST', 'https://api.audd.io/');
  xhr.responseType = 'json';
  xhr.send(fd);
  $('.recorder').append('<p class="fetching-message" aria-live="assertive">Fetching search results</p>');
}

function parseRetrievedData(parseData) {
  console.log('the response from audd is ', parseData)
  if (parseData.result === null || parseData.result === undefined) {
    $('.fetching-message').remove();
    $('.api-results').prop('hidden', false);
    $('.audD-result-title').html('Unable to identify audio. Try recording for a longer period or at a higher volume. Also note that Score Search can only identify recordings found in the iTunes store.');
    $('.imslp-search-results').html('');
    return; 
  }
  $('.api-results').prop('hidden', false);
  $('.audD-result-title').html(parseData.result.title);
  getGoogleAPIData(parseData);
}

function saveTrack() {
    var a = document.createElement( 'a' );
    a.download = 'record.ogg';
    a.href = audioSrc;
    document.body.appendChild( a );
    a.click();
    document.body.removeChild( a );
}

} 
else {
    if (location.protocol !== 'https:') {
        msg_box.innerHTML = messages.mic_error + '<br>'  + messages.use_https;
    } 
    else {
        msg_box.innerHTML = messages.mic_error; 
    }
    button.disabled = true;
}


//a function to create the result <li>
function createGoogleLI(googleResultItem) {
  const googleResultLI = (`
  <li class="google-api-result-li"><a class="appender" href="${googleResultItem.link}#Sheet_Music" target="_blank">${googleResultItem.title}</a></li>`);
  return googleResultLI;
}

function getGoogleAPIData(audDData) {
    let musicTitle = audDData.result.title;

    const query = {
        q: musicTitle,
        key: 'AIzaSyBWdG0-2UnBB1H0Z05xmLlk8NCZxh0UU_o',
        safe: 'high',
        num: '5', 
        cx: '008527752432457752614:gzthzygccjw'
    };

    $.getJSON('https://www.googleapis.com/customsearch/v1', query)
    .done(function(res) {
        renderGoogleAPIData(res, musicTitle);
    })
    .fail(function(errorMessage) {
        alert('There was a problem with your Google API search.');
    })
}

function renderGoogleAPIData(googleData, music_title) {
    if (googleData.items === undefined) {
        $('.fetching-message').remove();
        $('.audD-result-title').append('<p class="sheet-music-message">Unable to retrieve sheet music. Note that Score Search can only return sheet music that is in the public domain.</p>');
    }
    $('.fetching-message').remove();
    const googleAPIResults = googleData.items.map((item, index) => createGoogleLI(item));
    $('.api-results').prop('hidden', false);
    $('.imslp-search-results').html(googleAPIResults);
    $('.past-search-region').prop('hidden', true);
    if (localStorage.getItem('authToken')) {
        $('.save-button').prop('hidden', false);
        STATE.googleData = googleData;
        STATE.musicTitle = music_title;
    }
}

function savePastSearchToDB(apiResults, musicTitle) {
    let authenticationToken = localStorage.getItem('authToken');
        // function to parse the JWT
        const parseJwt = (authToken) => {
          try {
            let parsedToken = JSON.parse(atob(authToken.split('.')[1]));
            return parsedToken;
          } catch (e) {
            return null;
          }
        };
    let username = parseJwt(authenticationToken).user.username;
    let date = new Date();
    let dateString = date.toString();
    let truncatedDateString = dateString.substring(0, dateString.length -36);

    const resultLinks = apiResults.items.map(function(item) {
        let searchlink = `${item.link}#Sheet_Music`;
        return searchlink;
    }); 

    const savedSearch = {
        username: username,
        music_title: musicTitle,
        IMSLP_links: resultLinks,
        creation: truncatedDateString
    };
    let baseUrl;
    if (window.location.protocol === 'http:') {
        baseUrl = 'http://localhost:8080';
    }
    else {
        baseUrl = 'https://scoresearch.herokuapp.com';
    }

    $.ajax({
    url: `${baseUrl}/searches/`,
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(savedSearch),
    success: function(res, status, xhr) {
    },
    error: function(err) {
      console.error('There was an error in saving the search: ', err);
    }
  })
}

// function to get an authToken/login the user
function loginUser(usernm, pass) {

    const loginData = {
        username: usernm,
        password: pass
    };
    let baseUrl;
    if (window.location.protocol === 'http:') {
        baseUrl = 'http://localhost:8080';
    }
    else {
        baseUrl = 'https://scoresearch.herokuapp.com';
    }

    $.ajax({
        url: `${baseUrl}/auth/login`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(loginData),
        success: function(res, status, xhr) {
             // store the response's authToken in local storage
             localStorage.setItem('authToken', res.authToken);
             // set the auth token to a variable to retrieve it
             let authToken = localStorage.getItem('authToken');
             console.log('the current authToken is ', authToken);
             $('.authentication-region').prop('hidden', false);
             $('.authentication-text').text(`You are logged in as ${usernm}`);
        },
        error: function(err) {
          console.error('There was an Error in logging in the User:', err);
          $('.authentication-region').prop('hidden', false);
          $('.authentication-text').text(`Incorrect username or password`);
        }
    })
}

function accessSearches() {
    let authenticationToken = localStorage.getItem('authToken');
    let baseUrl;
    if (window.location.protocol === 'http:') {
        baseUrl = 'http://localhost:8080';
    }
    else {
        baseUrl = 'https://scoresearch.herokuapp.com';
    }

    $.ajax({
        // url of json searches for a particular user
        url: `${baseUrl}/searches/currentuser`,
        type: 'GET',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer  ${authenticationToken}`
        },
        success: function(res, status, xhr) {
            displayPastSearchResults(res);
        },
        error: function(err) {
          console.error('There was an Error in authenticating the user ', err);
        }
    })
}

function displayPastSearchResults(resultData) {
    const searches = [];
    for (let i = 0; i < resultData.searches.length; i++) {
        let searchLinks = "";

        for (let j = 0; j < resultData.searches[i].IMSLP_links.length; j++) {
          searchLinks += (`<li><a href="${resultData.searches[i].IMSLP_links[j]}" target="_blank">${resultData.searches[i].IMSLP_links[j].substring(23, resultData.searches[i].IMSLP_links[j].length - 12)}</a></li>`);
        }

        searches.push(
          `<div data-searchid="${resultData.searches[i].id}" class="past-search-items col-xs-12">
            <h3 class="music-title">${resultData.searches[i].music_title}</h3>
            <h3 class="creation-time">${resultData.searches[i].creation}</h3>
            <ul class="past-search-links">${searchLinks}</ul>
            <button type="button" class="delete-button" aria-label="delete button"><i class="material-icons">delete_forever</i></button>
          </div>`
        );
    }
        $('.past-searches').html(searches);
}

function deleteSearchResultFromDOM(search) {
  $(search).closest('div').remove();
}

function deleteSearchResultFromDB(searchID) {
    let baseUrl;
    if (window.location.protocol === 'http:') {
        baseUrl = 'http://localhost:8080';
    }
    else {
        baseUrl = 'https://scoresearch.herokuapp.com';
    }
    $.ajax({
    url: `${baseUrl}/searches/${searchID}`,
    type: 'DELETE',
    success: function(res, status, xhr) {
    },
    error: function(err) {
      console.error('There was an Error: ', err);
    }
    })
}

// on page load check if the user has an authentication token and listen for DOM events
$(function() {
    if (localStorage.getItem('authToken')) {
        let authenticationToken = localStorage.getItem('authToken');
        // function to parse the JWT
        const parseJwt = (authToken) => {
          try {
            let parsedToken = JSON.parse(atob(authToken.split('.')[1]));
            return parsedToken;
          } catch (e) {
            return null;
          }
        };
        let username = parseJwt(authenticationToken).user.username;
        $('.auth-links-region').prop('hidden', true);
        $('.authentication-region').prop('hidden', false);
        $('.authentication-text').text(`You are logged in as ${username}`);
        $('.mysearches-link').click(function() {
            accessSearches();
            $('.past-search-region').prop('hidden', false);
        });
    }
    let display = false;
    $('.usage-details').click(function(e) {
        if (display === false) {
            $('.instructions').prop('hidden', false);
            display = true;
        }
        else if (display === true) {
            $('.instructions').prop('hidden', true);
            display = false;
        }
    });
    let modalPropHidden = $('#modal').prop('hidden');
    //adds html for signup in modal
    $('.signup').click(function() {
        $('#modal').html(`
            <div class="form-positioner">
                <p class="signup-error-box"></p>
                <form class="signup-form" role="form">
                    <label for="signup-username">Username</label>
                    <input type="text" name="username" id="signup-username" required><br>
                    <label for="signup-email">Email</label>
                    <input type="email" name="email" id="signup-email" required><br>
                    <label for="signup-password">Password</label>
                    <input type="password" name="password" id="signup-password" required><br>
                    <input type="submit" value="Signup">
                </form>
            </div>
            `);
        setTimeout(function() { 
            $('#signup-username').focus(); 
        }, 1);
        modalPropHidden = true;
        if (typeof modalPropHidden !== typeof undefined && modalPropHidden !== false) {
            $('#modal').prop('hidden', false);
            $('body').css('background', 'rgba(0, 0, 0, .7)');
        }
    });
    // adds login html in modal
    $('.login').click(function() {
        $('#modal').html(`
            <div class="form-positioner">
                <p class="login-error-box"></p>
                <form class="login-form" role="form">
                    <label for="login-username">Username</label>
                    <input type="text" name="username" id="login-username" required><br>
                    <label for="login-password">Password</label>
                    <input type="password" name="password" id="login-password" required><br>
                    <input type="submit" value="Login">
                </form>
            </div>
            `);
        setTimeout(function() { 
            $('#login-username').focus(); 
        }, 1);
        modalPropHidden = true;
        if (typeof modalPropHidden !== typeof undefined && modalPropHidden !== false) {
            $('#modal').prop('hidden', false);
            $('body').css('background', 'rgba(0, 0, 0, .7)');
        }
    });
    // event listener to close out modal
    $(document).click(function(e) {
        if(!$(e.target).is('#modal') && !$(e.target).is('input') && !$(e.target).is('.signup-form') 
                                     && !$(e.target).is('.login-form') && !$(e.target).is('.form-positioner') 
                                     && !$(e.target).is('.login-error-box') && !$(e.target).is('.signup-error-box')) {
            setTimeout(function(){
                modalPropHidden = false;
            }, 300);
            if (typeof modalPropHidden !== typeof undefined && modalPropHidden !== true) {
                $('body').css('background', 'rgb(255, 255, 255)');
                $('#modal').prop('hidden', true);
            }      
        }  
    });
    // event handler for signing up a user
    $('body').on('submit', '.signup-form', function(e) {
        e.preventDefault();
        let username = $('#signup-username').val().toLowerCase();
        let email = $('#signup-email').val();
        let password = $('#signup-password').val();
        const data = {
            username: username,
            email: email,
            password: password
        };
        let baseUrl;
        if (window.location.protocol === 'http:') {
            baseUrl = 'http://localhost:8080';
        }
        else {
            baseUrl = 'https://scoresearch.herokuapp.com';
        }
        $.ajax({
            url: `${baseUrl}/users`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(res, status, xhr) {
                let userID = res.id;
                loginUser(username, password, userID);
                $('body').css('background', 'rgb(255, 255, 255)');
                $('#modal').prop('hidden', true);
                $('.auth-links-region').prop('hidden', true);
                $('#signup-email').val('');
                $('#signup-password').val('');
                $('#signup-username').val('');
            },
            error: function(err) {
              console.error('There was an Error in Creating the User: ', err);
              $('.signup-error-box').text(err.responseJSON.message);
              if (err.responseJSON.message === 'Password must be at least 8 characters long' || err.responseJSON.message === 'Password can only be 72 characters long') {
                $('#signup-password').val('');
              }
              if (err.responseJSON.message === 'Username already taken') {
                $('#signup-username').val('');
              }
            }
        })
        
    }); 
    // event handler for logging in the user
    $('body').on('submit', '.login-form', function(e) {
        e.preventDefault();
        let username = $('#login-username').val().toLowerCase();
        let password = $('#login-password').val();
        const loginData = {
            username: username,
            password: password
        };
        let baseUrl;
        if (window.location.protocol === 'http:') {
            baseUrl = 'http://localhost:8080';
        }
        else {
            baseUrl = 'https://scoresearch.herokuapp.com';
        }
        $.ajax({
            url: `${baseUrl}/auth/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(loginData),
            success: function(res, status, xhr) {
                $.ajax({
                    url: `${baseUrl}/users/${username}`,
                    type: 'GET',
                    contentType: 'application/json',
                    success: function(res, status, xhr) {
                        loginUser(username, password);
                        $('.auth-links-region').prop('hidden', true);
                        $('body').css('background', 'rgb(255, 255, 255)');
                        $('#modal').prop('hidden', true);
                    },
                    error: function(err) {
                        console.error('There was a problem retrieving the user by username');
                    }
                })
            },
            error: function(err) {
              console.error('There was an Error in logging in the User: ', err);
              $('.login-error-box').text(err.responseJSON.message);
            }
      })
        $('#login-username').val('');
        $('#login-password').val('');
    });
    // event listener link to save a search result 
    $('.save-button').click(function() {
        savePastSearchToDB(STATE.googleData, STATE.musicTitle);
        $('.past-search-region').prop('hidden', true);
        $('.save-button').prop('hidden', true);
    });
    // event listener to access past searches
    $('.mysearches-link').click(function() {
        accessSearches();
        $('.api-results').prop('hidden', true);
        $('.past-search-region').prop('hidden', false);
    });
    // event listener to delete a past search 
    $('body').on('click', '.delete-button', function() {
        let confirmDelete = confirm('Are you sure you want to delete this?');
        if (confirmDelete === true) { 
            deleteSearchResultFromDOM(this);
            let pastSearchID = $(this).closest('div').data('searchid');
            deleteSearchResultFromDB(pastSearchID);
        }
    });
    // event listener for loggin out the user
    $('body').on('click', '.logout-link', function() {
        localStorage.removeItem('authToken');
        $('.past-search-region').prop('hidden', true);
        $('.auth-links-region').prop('hidden', false);
        $('.authentication-region').prop('hidden', true);
        $('.past-searches').empty();
    });
    $(document).keydown(function(e) { 
    if (e.keyCode == 27) { 
        $('#modal').prop('hidden', true);
        $('body').css('background', 'rgb(255, 255, 255)');
    } 
});
});
},{"audio-recorder-polyfill":1}]},{},[3]);
