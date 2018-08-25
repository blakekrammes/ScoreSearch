// global variable for storing local variables 
const STATE = {};

var msg_box = document.getElementById( 'msg_box' ),
    button = document.getElementById( 'button' ),
    canvas = document.getElementById( 'canvas' ),
messages = {
    'mic_error': 'Error accessing the microphone', 
    'press_to_start': 'Click to Begin Recording', 
    'recording': 'Recording', 
    'play': 'Play', 
    'stop': 'Stop',
    'download': 'Download', 
    'use_https': 'This application will not work over an insecure connection. Use HTTPS.'
},
time;

$('#msg_box').text(messages.press_to_start);

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

let recorder;
let gumStream;
let btn_status = 'inactive';
let audio = new Audio();

if (navigator.mediaDevices.getUserMedia) {


    function beginRecording() {
        console.log('beginning the recording');
        let AudioContext = window.AudioContext || window.webkitAudioContext || false; 

        navigator.mediaDevices.getUserMedia({ 'audio': true })
        .then(function(stream) {

            button.classList.add('recording');
            btn_status = 'recording';

            $('#msg_box').text(messages.recording);

            time = Math.ceil( new Date().getTime() / 1000 );

            if (AudioContext) {
                let audioCtx = new AudioContext;
                gumStream = stream;
                let source = audioCtx.createMediaStreamSource(stream);
                recorder = new WebAudioRecorder(source, {
                    workerDir: 'web-audio-recorder-js/lib/',
                    // must use mp3 to work with Safari, but chomr/Firefox accept ogg
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
                mp3: {bitRate: 320},
            });

            recorder.startRecording();

            recorder.onComplete = function(recorder, blob) {
                console.log(blob)
                audioSrc = window.URL.createObjectURL(blob);
                audio.src = audioSrc;
                // createAudioPlayback(blob);
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
    }

    button.onclick = function () {
        if (btn_status === 'inactive' ) {
            beginRecording();
        } else if ( btn_status === 'recording') {
            stopRecording();
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


function stopRecording() {
  console.log('stopping the recording');
  let recordingTime = recorder.recordingTime();
  console.log(recordingTime);

  button.classList.remove('recording');
  btn_status = 'inactive';

  $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="txt_btn">${messages.play} (${t})</a><br>
                            <a href="#" onclick="save(); return false;" class="txt_btn">${messages.download}</a>`);

  var now = Math.ceil( new Date().getTime() / 1000 );
  var t = parseTime( now - time );

  let audioTrack = gumStream.getAudioTracks()[0];
  console.log(audioTrack);

  audioTrack.stop();

  recorder.finishRecording();

  // $('#msg_box').text(`Recorded for ${Math.round(recordingTime)} seconds`);
  $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="txt_btn">${messages.play} (${t})</a><br>
                            <a href="#" onclick="save(); return false;" class="txt_btn">${messages.download}</a>`);
  console.log('recording stopped');
}

function play() {
    audio.play();
    $('#msg_box').html(`<a href="#" onclick="pause(); return false;" class="txt_btn">${messages.stop}</a><br>
                        <a href="#" onclick="save(); return false;" class="txt_btn">${messages.download}</a>`);
}

function pause() {
    audio.pause();
    audio.currentTime = 0;
    $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="txt_btn">${messages.play}</a><br>
                        <a href="#" onclick="save(); return false;" class="txt_btn">${messages.download}</a>`);
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
}

function parseRetrievedData(parseData) {
    console.log('the data from the audD api is: ', parseData);
  if (parseData.result === null || parseData.result === undefined) {
    $('.combined-api-results').prop('hidden', false);
    $('.audD-result-title').html(`Unable to identify audio. Try recording for a longer period.`);
    return; 
  }
  $('.combined-api-results').prop('hidden', false);
  $('.audD-result-title').html(parseData.result.title);
  console.log('the initial response from the audD api is: ', parseData);
  getGoogleAPIData(parseData);
}

function save() {
    var a = document.createElement( 'a' );
    a.download = 'record.ogg';
    a.href = audioSrc;
    document.body.appendChild( a );
    a.click();
    document.body.removeChild( a );
}

} 
else {
    if ( location.protocol != 'https:' ) {
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
            $('.search-region').prop('hidden', false);
        });
    }
    let modalPropHidden = $('#modal').prop('hidden');
    //adds html for signup in modal
    $('.signup').click(function() {
        $('#modal').html(`
            <div class="form-positioner">
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
            `)
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
                <form class="login-form" role="form">
                    <label for="login-username">Username</label>
                    <input type="text" name="username" id="login-username" required><br>
                    <label for="login-password">Password</label>
                    <input type="password" name="password" id="login-password" required><br>
                    <input type="submit" value="Login">
                </form>
            </div>
            `)
        modalPropHidden = true;
        if (typeof modalPropHidden !== typeof undefined && modalPropHidden !== false) {
            $('#modal').prop('hidden', false);
            $('body').css('background', 'rgba(0, 0, 0, .7)');
        }
    });
    // event listener to close out modal
    $(document).click(function(e) {
        if(!$(e.target).is('#modal') && !$(e.target).is('input') && !$(e.target).is('.signup-form') && !$(e.target).is('.login-form') && !$(e.target).is('.form-positioner')) {
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
        let username = $('#signup-username').val();
        let email = $('#signup-email').val();
        let password = $('#signup-password').val();
        const data = {
            username: username,
            email: email,
            password: password
        };
        $.ajax({
            url: 'http://localhost:8080/users/',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(res, status, xhr) {
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
        $('.auth-links-region').prop('hidden', true);
        $('body').css('background', 'rgb(255, 255, 255)');
        $('#modal').prop('hidden', true);
    }); 
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
                $.ajax({
                    url: `http://localhost:8080/users/${username}`,
                    type: 'GET',
                    contentType: 'application/json',
                    success: function(res, status, xhr) {
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
        $('body').css('background', 'rgb(255, 255, 255)');
        $('#modal').prop('hidden', true);
    });
    // event listener link to save a search result 
    $('.save-link').click(function() {
        savePastSearchToDB(STATE.googleData, STATE.musicTitle);
        $('.search-region').prop('hidden', true);
        $('.save-link').prop('hidden', true);
    });
    // event listener to access past searches
    $('.mysearches-link').click(function() {
        accessSearches();
        $('.combined-api-results').prop('hidden', true);
        $('.search-region').prop('hidden', false);
    });
    // event listener to delete a past search 
    $('body').on('click', '.delete-button', function() {
      deleteSearchResultFromDOM(this);
      let pastSearchID = $(this).closest('li').data('searchid');
      deleteSearchResultFromDB(pastSearchID);
    });
    // event listener for loggin out the user
    $('body').on('click', '.logout-link', function() {
        localStorage.removeItem('authToken');
        $('.auth-links-region').prop('hidden', false);
        $('.authentication-region').prop('hidden', true);
        $('.searches').empty();
    });
});

// code to bypass wait time on IMSLP (suspect)
// function checkForRedirect(url) {
//     var waitTimer = document.getElementById('sm_dl_wait'),
//         nextUrl;

//     if (waitTimer !== null && document.domain === 'imslp.org') {
//         nextUrl = waitTimer.getAttribute('data-id');
//         window.location.href = nextUrl;
//     }
// };

// checkForRedirect(window.location.href);