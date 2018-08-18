var msg_box = document.getElementById( 'msg_box' ),
    button = document.getElementById( 'button' ),
    canvas = document.getElementById( 'canvas' ),
lang = {
    'mic_error': 'Error accessing the microphone', 
    'press_to_start': 'Press to start recording', 
    'recording': 'Recording', 
    'play': 'Play', 
    'stop': 'Stop',
    'download': 'Download', 
    'use_https': 'This application will not work over an insecure connection. Use HTTPS.'
},
time;

msg_box.innerHTML = lang.press_to_start;

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if ( navigator.mediaDevices === undefined ) {
    navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if ( navigator.mediaDevices.getUserMedia === undefined ) {
    navigator.mediaDevices.getUserMedia = function ( constrains ) {
        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if ( !getUserMedia )  {
            // Some browsers just don't implement it - return a rejected promise with an error
            // to keep a consistent interface
            return Promise.reject( new Error( 'getUserMedia is not implemented in this browser' ) );
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise( function( resolve, reject ) {
            getUserMedia.call( navigator, constrains, resolve, reject );
        } );
    }
}

if ( navigator.mediaDevices.getUserMedia ) {
    var btn_status = 'inactive',
        mediaRecorder,
        chunks = [],
        audio = new Audio(),
        mediaStream,
        audioSrc,
        type = {
            'type': 'audio/ogg;base64'
        },
        ctx,
        analys,
        blob;

    button.onclick = function () {
        if ( btn_status == 'inactive' ) {
            start();
        } else if ( btn_status == 'recording' ) {
            stop();
        }
    }

    function parseTime( sec ) {
        var h = parseInt( sec / 3600 );
        var m = parseInt( sec / 60 );
        var sec = sec - ( h * 3600 + m * 60 );

        h = h == 0 ? '' : h + ':';
        sec = sec < 10 ? '0' + sec : sec;

        return h + m + ':' + sec; 
    }

    function start() {
        navigator.mediaDevices.getUserMedia( { 'audio': true } ).then( function ( stream ) {
            mediaRecorder = new MediaRecorder( stream );
            mediaRecorder.start();

            button.classList.add('recording');
            btn_status = 'recording';

            msg_box.innerHTML = lang.recording;
          
            if (navigator.vibrate) navigator.vibrate(150);

            time = Math.ceil( new Date().getTime() / 1000 );


            mediaRecorder.ondataavailable = function ( event ) {
              console.log('data is being made available');
                chunks.push( event.data );
            }

            mediaRecorder.onstop = function () {
                stream.getTracks().forEach( function( track ) { track.stop() } );
                blob = new Blob( chunks, {type: 'audio/webm'});
                audioSrc = window.URL.createObjectURL( blob );
                audio.src = audioSrc;
                uploadBlob(chunks);
                chunks = [];
            }   
   
        } ).catch( function ( error ) {
            if ( location.protocol != 'https:' ) {
              msg_box.innerHTML = lang.mic_error + '<br>'  + lang.use_https;
            } else {
              msg_box.innerHTML = lang.mic_error; 
            }
            button.disabled = true;
        });
    }

    function stop() {
        mediaRecorder.stop();
        button.classList.remove( 'recording' );
        btn_status = 'inactive';
      
        if ( navigator.vibrate ) navigator.vibrate( [ 200, 100, 200 ] );

        var now = Math.ceil( new Date().getTime() / 1000 );

        var t = parseTime( now - time );

        msg_box.innerHTML = '<a href="#" onclick="play(); return false;" class="txt_btn">' + lang.play + ' (' + t + 's)</a><br>' +
                            '<a href="#" onclick="save(); return false;" class="txt_btn">' + lang.download + '</a>'
    }

    function play() {
        audio.play();
        msg_box.innerHTML = '<a href="#" onclick="pause(); return false;" class="txt_btn">' + lang.stop + '</a><br>' +
                            '<a href="#" onclick="save(); return false;" class="txt_btn">' + lang.download + '</a>';
    }

    function pause() {
        audio.pause();
        audio.currentTime = 0;
        msg_box.innerHTML = '<a href="#" onclick="play(); return false;" class="txt_btn">' + lang.play + '</a><br>' +
                            '<a href="#" onclick="save(); return false;" class="txt_btn">' + lang.download + '</a>'
    }

    function uploadBlob(blobData) {

      var reader = new window.FileReader();
        reader.readAsDataURL(blobData[0]);
        reader.onloadend = function () {
            base64data = reader.result;
            // console.log(base64data);
            let fixedb64String = base64data.replace(new RegExp("^.{0," +23+ "}(.*)"),  "$1" );
            POSTreq(fixedb64String);
        }

      function POSTreq (b64data) {
          var xhr = new XMLHttpRequest();
          var fd = new FormData();
          fd.append('api_token', '3e4055eb4b85f55e5681bbbf894e25f4');
          fd.append('audio', b64data);
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
      }
    }

    function parseRetrievedData(parseData) {
      if (parseData.result === null) {
        $('.audD-result-title').html(`Unable to identify audio. Try recording for a longer period.`)
      }
      $('.audD-result-title').html(parseData.result.title);
      console.log(parseData);
      getGoogleAPIData(renderGoogleAPIData, parseData);
    }

    function roundedRect(ctx, x, y, width, height, radius, fill) {
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, y + height - radius);
        ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
        ctx.lineTo(x + width - radius, y + height);
        ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
        ctx.lineTo(x + width, y + radius);
        ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.quadraticCurveTo(x, y, x, y + radius);
        ctx.fillStyle = fill;
        ctx.fill();
    }

    function save() {
        var a = document.createElement( 'a' );
        a.download = 'record.ogg';
        a.href = audioSrc;
        document.body.appendChild( a );
        a.click();

        document.body.removeChild( a );
    }

} else {
    if ( location.protocol != 'https:' ) {
      msg_box.innerHTML = lang.mic_error + '<br>'  + lang.use_https;
    } else {
      msg_box.innerHTML = lang.mic_error; 
    }
    button.disabled = true;
}


//a function to create the result <li>
function createGoogleLI(googleResultItem) {
  const googleResultLI = (`
  <li class="google-api-result-li"><a class="appender" href="${googleResultItem.link}#Sheet_Music" target="_blank">${googleResultItem.title}</a></li>`);
  return googleResultLI;
}


function getGoogleAPIData(renderDataCallback, audDData) {
  const query = {
    q: audDData.result.title,
    key: 'AIzaSyBWdG0-2UnBB1H0Z05xmLlk8NCZxh0UU_o',
    safe: 'high',
    num: '10', 
    cx: '008527752432457752614:gzthzygccjw'
  }
 $.getJSON('https://www.googleapis.com/customsearch/v1', query, renderDataCallback).fail(errorMessage => {
    alert('There was a problem with your Google API search.');
  })
}

function renderGoogleAPIData(googleData) {
  const googleAPIResults = googleData.items.map((item, index) => createGoogleLI(item));
  $('.imslp-search-results').html(googleAPIResults);
  console.log(googleData);
}

//dynamically added html for signup/login modal
$('.signup').click(function() {
    $('.form-region').html(`
        <form class="signup-form">
          Username: <input type="text" name="username" id="signup-username" required><br>
          Email:    <input type="text" name="email" id="signup-email" required><br>
          Password: <input type="text" name="password" id="signup-password" required><br>
          <input type="submit" value="Signup">
        </form>
        `)
});

$('.login').click(function() {
    $('.form-region').html(`
        <form class="login-form">
          Username: <input type="text" name="username" id="login-username" required><br>
          Password: <input type="text" name="password" id="login-password" required><br>
          <input type="submit" value="Login">
        </form>
        `)
});

// event handler for signing up a user
$('body').on('submit', '.signup-form', function(e) {
    e.preventDefault();
    let username = $('#signup-username').val();
    let email = $('#signup-email').val();
    let password = $('#signup-password').val();

    const data = {
        username: username,
        email: email,
        password: password
    };

    console.log(username, email, password);

    $.ajax({
    url: 'http://localhost:8080/users/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function(res, status, xhr) {
      // console.log('Here is the response from posting a new user', res, status, xhr);
      console.log('the user id is_____', res.id);
      let userID = res.id;
      loginUser(username, password, userID);
    },
    error: function(err) {
      console.error('There was an Error in Creating the User: ', err);
    }
  })
    $('#signup-username').val('');
    $('#signup-email').val('');
    $('#signup-password').val('');
})

// event handler for logging in the user
$('body').on('submit', '.login-form', function(e) {
    e.preventDefault();
    let username = $('#login-username').val();
    let password = $('#login-password').val();

    const loginData = {
        username: username,
        password: password
    };

    $.ajax({
    url: 'http://localhost:8080/auth/login',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(loginData),
    success: function(res, status, xhr) {
      // console.log('Here is the response from logging in a user', res, status, xhr);
      let userID = res.id;
      loginUser(username, password, userID);
    },
    error: function(err) {
      console.error('There was an Error in logging in the User: ', err);
    }
  })
    $('#login-username').val('');
    $('#login-password').val('');
})

// function to get an authToken/login the user
function loginUser(usernm, pass, userid) {
    // console.log(usernm, pass);

    const loginData = {
        username: usernm,
        password: pass
    };

    $.ajax({
        url: 'http://localhost:8080/auth/login',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(loginData),
        success: function(res, status, xhr) {
             // console.log(res.authToken);
             // store the response's authToken in local storage
             localStorage.setItem('authToken', res.authToken);
             // set the auth token to a variable to retrieve it
             let authToken = localStorage.getItem('authToken');
             $('.mysearches-link').attr('hidden', false);
             console.log(authToken);
             $('.mysearches-link').click(function() {
                console.log('userid in loginUser is_____', userid);
                accessSearches(authToken, userid);
             });
        },
        error: function(err) {
          console.error('There was an Error in logging in the User: ', err);
        }
    })
}

function accessSearches(authenticationToken, userId) {

    $.ajax({
        // url of json searches for a particular user
        url: 'http://localhost:8080/mysearches',
        type: 'GET',
        Authorization: `Bearer ${authenticationToken}`,
        contentType: 'application/json',
        success: function(res, status, xhr) {
             console.log('here is the response from accessing mysearches', res);
        },
        error: function(err) {
          console.error('There was an Error in authenticating the user ', err);
        }
    })
    console.log('here is the userId in accessSearches______', userId);
    getPastSearchResults(userId, displayPastSearchResults);
}

function getPastSearchResults(usereyeD, callback) {
    const pastSearchUrl = `http://localhost:8080/jsonsearches/${usereyeD}`;
    //for heroku:
    // let userID;
    // const herokuPastUserSearchesURL = `https://scoresearch.herokuapp.com/jsonsearches/${userID}`;
    $.getJSON(pastSearchUrl, callback).fail(errorMessage => {
        alert(`There was a problem with your request for your account's past searches.`);
        console.error(errorMessage);
      });
}

function displayPastSearchResults(resultData) {
  for (let i = 0; i < resultData.searches.length; i++) {
    let searchLinks = "";
    for (let j = 0; j < resultData.searches[i].IMSLP_links.length; j++) {
      searchLinks += (`<li><a href="${resultData.searches[i].IMSLP_links[j]}">${resultData.searches[i].IMSLP_links[j]}</a></li>`);
    }
    $('.searches').append(
      `<li data-searchid="${resultData.searches[i].id}">
        <h3>${resultData.searches[0].username}</h3>
        <h3>Search No. ${i+1}</h3>
        <h3>${resultData.searches[i].music_title}</h3>
        <button type="button" class="delete-button"><i class="fa fa-trash"></i></button>
        <ul class="search-links">${searchLinks}</ul>
      </li>`
    );
  }
}

$('body').on('click', '.delete-button', function() {
  deleteSearchResultFromDOM(this);
  let pastSearchID = $(this).closest('li').data('searchid');
  deleteSearchResultFromDB(pastSearchID);
})


function deleteSearchResultFromDOM(search) {
  $(search).closest('li').remove();
}

function deleteSearchResultFromDB(searchID) {
  console.log(searchID);
  $.ajax({
    url: `http://localhost:8080/searches/${searchID}`,
    type: 'DELETE',
    success: function(res, status, xhr) {
      console.log('Here is the response', res, status, xhr);
    },
    error: function(err) {
      console.error('There was an Error: ', err);
    }
  })
}








