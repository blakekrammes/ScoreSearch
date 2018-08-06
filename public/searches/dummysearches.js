'use strict';

var DUMMY_PAST_SEARCHES = {
	"searches": [
		{
			"id": "12345",
			"music_title": "Water Music",
			"IMSLP_links": [ 
			"https://imslp.org/wiki/Water_Music,_HWV_348-350_(Handel,_George_Frideric)#Sheet_Music", 
			"https://imslp.org/wiki/Suite_in_D_major%2C_HWV_341_(Handel%2C_George_Frideric)#Sheet_Music", 
			"https://imslp.org/wiki/Music_for_the_Royal_Fireworks,_HWV_351_(Handel,_George_Frideric)#Sheet_Music",
			"https://imslp.org/wiki/List_of_works_by_George_Frideric_Handel#Sheet_Music" 
			]
		},
		{
			"id": "23456",
			"music_title": "Symphony No. 9",
			"IMSLP_links": [ 
			"https://imslp.org/wiki/Symphony_No.9%2C_Op.125_(Beethoven%2C_Ludwig_van)#Sheet_Music", 
			"https://imslp.org/wiki/Beethoven's_Ninth_Symphony_(Choral)_(Grove%2C_George)#Sheet_Music", 
			"https://imslp.org/wiki/Template:Symphonies_(Beethoven,_Ludwig_van)#Sheet_Music"
			]
		},
		{
			"id": "34567",
			"music_title": "The Moldau",
			"IMSLP_links": [ 
			"https://imslp.org/wiki/Vltava%2C_JB_1:112%2F2_(Smetana%2C_Bed%C5%99ich)#Sheet_Music", 
			"https://imslp.org/wiki/M%C3%A1_Vlast,_JB_1:112_(Smetana,_Bed%C5%99ich)#Sheet_Music", 
			"https://imslp.org/wiki/List_of_works_by_Bed%C5%99ich_Smetana#Sheet_Music"
			]
		},
    {
			"id": "23456",
			"music_title": "Symphony No. 10",
			"IMSLP_links": [ 
			"https://imslp.org/wiki/Symphony_No.9%2C_Op.125_(Beethoven%2C_Ludwig_van)#Sheet_Music", 
			"https://imslp.org/wiki/Beethoven's_Ninth_Symphony_(Choral)_(Grove%2C_George)#Sheet_Music", 
			"https://imslp.org/wiki/Template:Symphonies_(Beethoven,_Ludwig_van)#Sheet_Music"
			]
		}
	]
}

function getPastSearchResults(callback) {
	setTimeout(function() {callback(DUMMY_PAST_SEARCHES)}, 100);
}

function displayPastSearchResults(resultData) {

  for (let i = 0; i < resultData.searches.length; i++) {
    let searchLinks = "";
    for (let j = 0; j < resultData.searches[i].IMSLP_links.length; j++) {
      searchLinks += (`<li><a href="${resultData.searches[i].IMSLP_links[j]}">${resultData.searches[i].IMSLP_links[j]}</a></li>`);
    }
    $('.searches').append(`<li><h3>Search No. ${i+1}</h3><h3>${resultData.searches[i].music_title}</h3><ul class="search-links">${searchLinks}</ul></li>`);
  }
}

function getAndDisplaySearchResults() {
	getPastSearchResults(displayPastSearchResults);
}

$(function() {
	getAndDisplaySearchResults();	
});
