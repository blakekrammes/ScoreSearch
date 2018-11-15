// global variable for storing local variables 
const STATE = {};

// window.MediaRecorder = require('audio-recorder-polyfill')

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
let seconds = 0;
let el = document.getElementById('seconds-counter');

$('#msg_box').text(messages.press_to_start);

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

let recorder;
let gumStream;
let btn_status = 'inactive';
let audio = new Audio();
let lastCount;
// let authLinks = document.getElementById('auth-links-region');

if (navigator.mediaDevices.getUserMedia) {

    if (window.webkitAudioContext) {
        $('#msg_box').text(messages.not_supported_in_safari_or_edge);
        $('.auth-links-region').css('display', 'none'); 
        $('.record_btn').css('display', 'none');
        $('.usage-details').css('display', 'none');
    }

    function beginRecording() {
        $('.past-search-region').prop('hidden', true);
        $('.api-results').prop('hidden', true);
        $('.authentication-region').prop('hidden', true);
        $('.auth-links-region').prop('hidden', true);
        $('.usage-details').prop('hidden', true);
        $('.instructions').prop('hidden', true);
        $('.audD-result-title').prop('hidden', true);
        $('.audD-error-message').prop('hidden', true);
        $('.sheet-music-message').prop('hidden', true);
        $('.save-button').prop('hidden', true);
        $('.sheet-music-message').remove();

        let AudioContext = window.AudioContext || window.webkitAudioContext || false; 

        navigator.mediaDevices.getUserMedia({ 'audio': true })
        .then(function(stream) {

            button.classList.add('recording');
            btn_status = 'recording';

            $('#msg_box').text(messages.recording);

            if (seconds > 0) {
                lastCount = seconds;
                $('#seconds-counter').css('display', 'block');
                let cancle = setInterval(incrementSeconds, 1000);
                clearInterval(cancle);   
            }
            else {
                $('#seconds-counter').css('display', 'block');
                incrementSeconds();
                let cancle = setInterval(incrementSeconds, 1000);
            }

            time = Math.ceil( new Date().getTime() / 1000 );
        
            if (AudioContext) {
                let audioCtx = new AudioContext;
                gumStream = stream;
                let source = audioCtx.createMediaStreamSource(stream);
                recorder = new WebAudioRecorder(source, {
                    workerDir: 'web_audio_recorder_js/',
                    // must use mp3 to work with Safari, but chrome/firefox accept ogg
                    encoding: 'mp3'
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
    }

    button.onclick = function () {
        if (btn_status === 'inactive') {
            beginRecording();
        } else if (btn_status === 'recording') {
            stopRecording();
        }
    }

    function parseTime(sec) {
        var h = parseInt( sec / 3600 );
        var m = parseInt( sec / 60 );

        var sec = sec - ( h * 3600 + m * 60 );

        h = h == 0 ? '' : h + ':';
        sec = sec < 10 ? '0' + sec : sec;

        sec = lastCount < 10 ? '0' + lastCount : lastCount;

        return h + m + ':' + sec; 
    }
    
    function incrementSeconds() {
        if (seconds > 0 && btn_status === 'inactive') {
            seconds = 0;
        }
        seconds += 1;
        el.innerText = seconds;
    }

function stopRecording() {
  $('#seconds-counter').css('display', 'none');
  lastCount = seconds;
  seconds = 0;
  
  let recordingTime = recorder.recordingTime();

  $('#msg_box').css('display', 'none');
  button.classList.remove('recording');
  btn_status = 'inactive';

  let audioTrack = gumStream.getAudioTracks()[0];

  audioTrack.stop();

  recorder.finishRecording();
}

function play() {
    audio.play();
    $('#msg_box').html(`<a href="#" onclick="pause(); return false;" class="ui-link txt_btn">${messages.stop}</a><br>
                        <a href="#" onclick="save(); return false;" class="ui-link txt_btn">${messages.download}</a>`);
}

function pause() {
    audio.pause();
    audio.currentTime = 0;
    $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="ui-link txt_btn">${messages.play}</a><br>
                        <a href="#" onclick="save(); return false;" class="ui-link txt_btn">${messages.download}</a>`);
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
  $('body').css('overflow', 'hidden');
  $('.recorder').append('<div class="loader">Loading...</div>');
}

function parseRetrievedData(parseData) {

    let authText = $('.authentication-text').text();

    let loggedInText = 'You are logged in as monsieur demo';

    $('.loader').remove();
    $('body').css('overflow', 'visible');
    $('#msg_box').css('display', 'block');

    $('.auth-links-region').prop('hidden', false);
      if (localStorage.getItem('authToken')) {
        $('.authentication-region').prop('hidden', false);
        $('.auth-links-region').prop('hidden', true);
      }
      else if (authText === loggedInText) {
        $('.authentication-region').prop('hidden', false);
        $('.auth-links-region').prop('hidden', true);
      }

      $('.usage-details').prop('hidden', false);

      var now = Math.ceil( new Date().getTime() / 1000 );
      var t = parseTime( now - time );

      $('#msg_box').html(`<a href="#" onclick="play(); return false;" class="ui-link txt_btn">${messages.play} (${t})</a><br>
                            <a href="#" onclick="save(); return false;" class="ui-link txt_btn">${messages.download}</a>`);

  if (parseData === null || parseData.result === null || parseData.result === undefined) {
    $('.api-results').prop('hidden', false);
    $('.audD-error-message').prop('hidden', false);
    $('.audD-error-message').html('Unable to identify audio. Try recording for a longer period or at a higher volume. Also note that Score Search can only identify recordings found in the itunes store.');
    $('.imslp-search-results').html('');
    return; 
  }
  $('.api-results').prop('hidden', false);
  $('.audD-result-title').prop('hidden', false);
  $('.audD-result-title').html(parseData.result.title);
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
// else {
//     if (location.protocol !== 'https:') {
//         msg_box.innerHTML = messages.mic_error + '<br>'  + messages.use_https;
//     } 
//     else {
//         msg_box.innerHTML = messages.mic_error; 
//     }
//     button.disabled = true;
// }


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
    let authText = $('.authentication-text').text();
    let loggedInText = 'You are logged in as monsieur demo';

    if (googleData.items === undefined || googleData.items === null) {
        $('<p class="sheet-music-message">Unable to retrieve sheet music. Note that Score Search can only return sheet music that is in the public domain.</p>').insertAfter('.audD-result-title');
        $('.imslp-search-results').html('');
    }

    else {
        const googleAPIResults = googleData.items.map((item, index) => createGoogleLI(item));
        $('.api-results').prop('hidden', false);
        $('.imslp-search-results').html(googleAPIResults);
        $('.past-search-region').prop('hidden', true);
        if (localStorage.getItem('authToken')) {
            $('.save-button').prop('hidden', false);
            STATE.googleData = googleData;
            STATE.musicTitle = music_title;
        }
        else if (authText === loggedInText) {
            $('.save-button').prop('hidden', false);
            STATE.googleData = googleData;
            STATE.musicTitle = music_title;
        }
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
    let truncatedDateString = dateString.substring(0, dateString.length - 36);

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
// array of demo searches
const demoSearches = [
    `<div data-searchid="1234" class="past-search-items col-xs-12">
        <h3 class="music-title">The Blue Danube</h3>
        <h3 class="creation-time">Mon November 5 2018 11:25</h3>
        <ul class="past-search-links">
            <li><a href="https://imslp.org/wiki/An_der_sch%C3%B6nen_blauen_Donau%2C_Op.314_(Strauss_Jr.%2C_Johann)#Sheet_Music" target="_blank">The Blue Danube</a></li>
            <li><a href="https://imslp.org/wiki/Gems_of_the_Beautiful_Blue_Danube_Waltzes_(Hayden%2C_Winslow_Lewis)#Sheet_Music" target="_blank">Gems of the Beautiful Blue Danube Waltzes</a></li>
        </ul>
        <button type="button" class="delete-button" aria-label="delete button"><i class="material-icons">delete_forever</i></button>
    </div>`,
    `<div data-searchid="1235" class="past-search-items col-xs-12">
        <h3 class="music-title">Brandenburg Concerto 1</h3>
        <h3 class="creation-time">Mon November 5 2018 16:40</h3>
        <ul class="past-search-links">
            <li><a href="https://imslp.org/wiki/Brandenburg_Concerto_No.1_in_F_major%2C_BWV_1046_(Bach%2C_Johann_Sebastian)#Sheet_Music" target="_blank">Brandenburg Concerto 1</a></li>
            <li><a href="https://imslp.org/wiki/Brandenburg_Concertos,_BWV_1046-51_(Bach,_Johann_Sebastian)" target="_blank">Brandenburg Concertos</a></li>
        </ul>
        <button type="button" class="delete-button" aria-label="delete button"><i class="material-icons">delete_forever</i></button>
    </div>`,
    `<div data-searchid="1236" class="past-search-items col-xs-12">
        <h3 class="music-title">The Moldau</h3>
        <h3 class="creation-time">Thu November 1 2018 12:30</h3>
        <ul class="past-search-links">
        <li><a href="https://imslp.org/wiki/Vltava,_JB_1:112/2_(Smetana,_Bed%C5%99ich)#Sheet_Music" target="_blank">The Moldau</a></li>
        <li><a href="https://imslp.org/wiki/List_of_works_by_Bed%C5%99ich_Smetana" target="_blank">List of Works by Smetana</a></li>
        </ul>
        <button type="button" class="delete-button" aria-label="delete button"><i class="material-icons">delete_forever</i></button>
    </div>`
];

function savePastDemoSearch(apiResults, musicTitle) {
    let date = new Date();
    let dateString = date.toString();
    let truncatedDateString = dateString.substring(0, dateString.length - 36);
    demoSearches.push(
          `<div data-searchid="1237" class="past-search-items col-xs-12">
            <h3 class="music-title">${musicTitle}</h3>
            <h3 class="creation-time">${truncatedDateString}</h3>
            <ul class="past-search-links">
                <li><a href="${apiResults.items[0].link}#Sheet_Music" target="_blank">${apiResults.items[0].title}</a></li>
                <li><a href="${apiResults.items[1].link}#Sheet_Music" target="_blank">${apiResults.items[1].title}</a></li>
                <li><a href="${apiResults.items[2].link}#Sheet_Music" target="_blank">${apiResults.items[2].title}</a></li>                      
                <li><a href="${apiResults.items[3].link}#Sheet_Music" target="_blank">${apiResults.items[3].title}</a></li>
                <li><a href="${apiResults.items[4].link}#Sheet_Music" target="_blank">${apiResults.items[4].title}</a></li>
           </ul>
            <button type="button" class="delete-button" aria-label="delete button"><i class="material-icons">delete_forever</i></button>
          </div>`
    );
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

function showDemoSearches() {
    $('.past-search-region').prop('hidden', false);
    $('.past-searches').html(demoSearches);
}

function deleteSearchResultFromDOM(search) {
  $(search).closest('div').remove();
}

function deleteDemoSearchResultFromDOM(search) {
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
        $('.demo').css('display', 'none');
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
        $('.api-results').prop('hidden', true);
        $('.auth-links-region').prop('hidden', true);
        $('#modal').html(`
            <div class="form-positioner">
                <p class="signup-error-box"></p>
                <form class="signup-form" role="form">
                    <label for="signup-username">Username</label><br>
                    <input type="text" name="username" id="signup-username" required><br>
                    <label for="signup-email">Email</label><br>
                    <input type="email" name="email" id="signup-email" required><br>
                    <label for="signup-password">Password</label><br>
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
        $('.api-results').prop('hidden', true);
        $('.auth-links-region').prop('hidden', true);
        $('#modal').html(`
            <div class="form-positioner">
                <p class="login-error-box"></p>
                <form class="login-form" role="form">
                    <label for="login-username">Username</label><br>
                    <input type="text" name="username" id="login-username" required><br>
                    <label for="login-password">Password</label><br>
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
    $('.demo').click(function() {
        $('.login').css('display', 'none');
        $('.signup').css('display', 'none');
        $('.demo').css('display', 'none');
        $('.api-results').prop('hidden', true);
        $('.auth-links-region').prop('hidden', true);
        $('.authentication-region').prop('hidden', false);
        $('.authentication-text').text('You are logged in as monsieur demo');
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
                $('body').css('background', '#DEDEDE');
                $('#modal').prop('hidden', true);
                if (btn_status === 'recording') {
                    $('.auth-links-region').prop('hidden', true);
                }
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
                $('body').css('background', '#DEDEDE');
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
                        $('body').css('background', '#DEDEDE');
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
        if (localStorage.getItem('authToken')) {
            savePastSearchToDB(STATE.googleData, STATE.musicTitle);
            $('.past-search-region').prop('hidden', true);
            $('.save-button').prop('hidden', true);
        }
        else {
            savePastDemoSearch(STATE.googleData, STATE.musicTitle);
            $('.past-search-region').prop('hidden', true);
            $('.save-button').prop('hidden', true);
        }
    });
    // event listener to access past searches
    $('.mysearches-link').click(function() {
        if (localStorage.getItem('authToken')) {
            accessSearches();
            $('.api-results').prop('hidden', true);
            $('.past-search-region').prop('hidden', false);
        }
        else {
            showDemoSearches();
            $('.api-results').prop('hidden', true);
            $('.past-search-region').prop('hidden', false);
        }
        
    });
    // event listener to delete a past search 
    $('body').on('click', '.delete-button', function() {
        let confirmDelete = confirm('Are you sure you want to delete this?');
        if (localStorage.getItem('authToken')) {
            if (confirmDelete === true) { 
                deleteSearchResultFromDOM(this);
                let pastSearchID = $(this).closest('div').data('searchid');
                deleteSearchResultFromDB(pastSearchID);
            }
        }
        else {
            if (confirmDelete === true) {
                deleteDemoSearchResultFromDOM(this);
            }
        }
    });
    // event listener for loggin out the user
    $('body').on('click', '.logout-link', function() {
        $('.api-results').prop('hidden', true);
        if (localStorage.getItem('authToken')) {
            localStorage.removeItem('authToken');
            $('.past-search-region').prop('hidden', true);
            $('.auth-links-region').prop('hidden', false);
            $('.authentication-region').prop('hidden', true);
            $('.past-searches').empty();
        }
        // for exiting the demo account
        else {
            $('.login').css('display', 'inline-block');
            $('.signup').css('display', 'inline-block');
            $('.demo').css('display', 'inline-block');
            $('.auth-links-region').prop('hidden', false);
            $('.authentication-region').prop('hidden', true);
            $('.past-searches').empty();
        }
    });
    $(document).keydown(function(e) { 
    if (e.keyCode == 27) { 
        $('#modal').prop('hidden', true);
        $('.auth-links-region').prop('hidden', false);
        $('body').css('background', '#DEDEDE');
    } 
});
});