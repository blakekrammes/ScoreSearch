// global variable for storing local variables 
const STATE = {};

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
        console.log('the data from the audD api is: ', parseData);
      if (parseData.result === null || parseData.result === undefined) {
        $('.combined-api-results').prop('hidden', false);
        $('.audD-result-title').html(`Unable to identify audio. Try recording for a longer period.`);
        return; 
      }
      console.log(parseData);
      $('.combined-api-results').prop('hidden', false);
      $('.audD-result-title').html(parseData.result.title);
      console.log('the initial response from the audD api is: ', parseData);
      getGoogleAPIData(parseData);
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

function getGoogleAPIData(audDData) {
    let musicTitle = audDData.result.title;

    const query = {
    q: musicTitle,
    key: 'AIzaSyBWdG0-2UnBB1H0Z05xmLlk8NCZxh0UU_o',
    safe: 'high',
    num: '5', 
    cx: '008527752432457752614:gzthzygccjw'
    }
    console.log('query object is this: ', query)

    $.getJSON('https://www.googleapis.com/customsearch/v1', query)
    .done(function(res) {
        console.log('in getGoogleAPIData res is: ', res);
        renderGoogleAPIData(res, musicTitle);
    })
    .fail(function(errorMessage) {
    alert('There was a problem with your Google API search.');
    })
}

function renderGoogleAPIData(googleData, music_title) {
    console.log('here is the data from the google api: ', googleData);
    if (googleData.items === undefined) {
        $('.audD-result-title').html(`Unable to retrieve sheet music.`);
    }
    const googleAPIResults = googleData.items.map((item, index) => createGoogleLI(item));
    $('.combined-api-results').prop('hidden', false);
    $('.imslp-search-results').html(googleAPIResults);
    if (localStorage.getItem('authToken')) {
        $('.search-region').prop('hidden', false);
        $('.save-link').prop('hidden', false);

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

    const resultLinks = apiResults.items.map(function(item) {
        let searchlink = `${item.link}#Sheet_Music`;
        return searchlink;
    }) 
    
    const savedSearch = {
        username: username,
        music_title: musicTitle,
        IMSLP_links: resultLinks
    };

    $.ajax({
    url: 'http://localhost:8080/searches/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(savedSearch),
    success: function(res, status, xhr) {
      // console.log('Here is the response from posting a new user', res, status, xhr);
      console.log('the response from saving a search is: ', res);
    },
    error: function(err) {
      console.error('There was an error in saving the search: ', err);
    }
  })
}

// ––– working with DB and DOM manipulation
//
//

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
    $('.auth-links-region', '.form-region').attr('hidden', true);
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
      $.ajax({
        url: `http://localhost:8080/users/${username}`,
        type: 'GET',
        contentType: 'application/json',
        success: function(res, status, xhr) {
            // console.log('res in retrieveUserIDByUsername is___________', res);
            loginUser(username, password);
        },
        error: function(err) {
            console.error('There was a problem retrieving the user by username');
        }
      })
    },
    error: function(err) {
      console.error('There was an Error in logging in the User: ', err);
    }
  })
 
    $('#login-username').val('');
    $('#login-password').val('');
    $('.auth-links-region').prop('hidden', true);
    $('.form-region').prop('hidden', true);
})

// function to get an authToken/login the user
function loginUser(usernm, pass) {
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
             // store the response's authToken in local storage
             localStorage.setItem('authToken', res.authToken);
             // set the auth token to a variable to retrieve it
             let authToken = localStorage.getItem('authToken');
             $('.authentication-region').prop('hidden', false);
             console.log('the current authToken is:', authToken);
             $('.authentication-text').text(`You are logged in as ${usernm}`);
        },
        error: function(err) {
          console.error('There was an Error in logging in the User:', err);
          $('.authentication-region').prop('hidden', false);
          $('.authentication-text').text(`Incorrect username or password`);
        }
    })
}

// event listener for loggin out the user
$('body').on('click', '.logout-link', function() {
    localStorage.removeItem('authToken');
    // localStorage.removeItem('userID');
    $('.form-region').prop('hidden', false);
    $('.auth-links-region').prop('hidden', false);
    $('.authentication-region').prop('hidden', true);
    $('.searches').empty();
});

function accessSearches() {
    let authenticationToken = localStorage.getItem('authToken');

    $.ajax({
        // url of json searches for a particular user
        url: 'http://localhost:8080/searches/currentuser',
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
          searchLinks += (`<li><a href="${resultData.searches[i].IMSLP_links[j]}">${resultData.searches[i].IMSLP_links[j]}</a></li>`);
        }

        searches.push(
          `<li data-searchid="${resultData.searches[i].id}" class="search-results">
            <h3>${resultData.searches[0].username}</h3>
            <h3>Search No. ${i+1}</h3>
            <h3>${resultData.searches[i].music_title}</h3>
            <button type="button" class="delete-button"><i class="fa fa-trash"></i></button>
            <ul class="search-links">${searchLinks}</ul>
          </li>`
        );
    }
        $('.searches').html(searches);
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

// on page load check if the user has an authentication token
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
        $('.form-region').prop('hidden', true);
        $('.authentication-region').prop('hidden', false);
        $('.authentication-text').text(`You are logged in as ${username}`);
        $('.mysearches-link').click(function() {
            accessSearches();
            $('.search-region').prop('hidden', false);
        });
    }

    //adds html for signup in modal
    if($('#modal').prop('hidden', false)){
        $('.signup').click(function() {
            console.log('is signup firing?');
            $('#modal').html(`
                <form class="signup-form" role="form">
                  Username: <input type="text" name="username" id="signup-username" required><br>
                  Email:    <input type="text" name="email" id="signup-email" required><br>
                  Password: <input type="text" name="password" id="signup-password" required><br>
                  <input type="submit" value="Signup">
                </form>
                `)
            $('#modal').prop('hidden', false);
        });

        // adds login html in modal
        $('.login').click(function() {
            console.log('is login firing?');
            $('#modal').html(`
                <form class="login-form" role="form">
                  Username: <input type="text" name="username" id="login-username" required><br>
                  Password: <input type="text" name="password" id="login-password" required><br>
                  <input type="submit" value="Login">
                </form>
                `)
            $('#modal').prop('hidden', true);
        });
    }

    // event listener to close out modal
    if($('#modal').prop('hidden', true)){
        $(document).click(function(e) {
            if(!$(e.target).is('#modal')) {
                $('#modal').prop('hidden', true);
            }
        });
    }

    // event listener link to save a search result 
    $('.save-link').click(function() {
        savePastSearchToDB(STATE.googleData, STATE.musicTitle);
        $('.search-region').prop('hidden', true);
        $('.save-link').prop('hidden', true);
    })
    // event listener to access past searches
    $('.mysearches-link').click(function() {
        accessSearches();
        $('.combined-api-results').prop('hidden', true);
        $('.search-region').prop('hidden', false);
    });
});


