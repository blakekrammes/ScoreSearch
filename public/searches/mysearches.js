'use strict';

function getPastSearchResults(callback) {
// url with Blakesters' user ID
const pastUserSearchesURL = 'http://localhost:8080/jsonsearches/5b7312391ace09d85cd5cba4';
//for heroku:
// let userID;
// const herokuPastUserSearchesURL = `https://scoresearch.herokuapp.com/jsonsearches/${userID}`;
$.getJSON(pastUserSearchesURL, callback).fail(errorMessage => {
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

function getAndDisplaySearchResults() {
	getPastSearchResults(displayPastSearchResults);
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

$(document).ready(function() {
	getAndDisplaySearchResults();
});