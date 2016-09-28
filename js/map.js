var firebase = new Firebase("https://encoded-road-138721.firebaseio.com/");
var requestForm = '<div id="request-infowindow">' +
    '<h3>Request a concert!</h3>' +

    '<div id="infowindow-not-logged-in" style="display:none;">' +
    '<div class="fb-login-button" data-max-rows="1" data-size="medium" data-show-faces="false" data-auto-logout-link="false" data-scope="public_profile,email" onlogin="drawInfoWindow();"></div>' +
		'<p>&mdash;or&mdash;</p>' +
		'<p><label>Your name:</label> <input type="text" id="form_full_name"></input>' +
		'<label>Your email address:</label> <input type="text" id="form_email_address"></input></p>' +
    '<p><button onclick="saveRequest()">RDP!</button></p>' +
    '</div>' +

    '<div id="infowindow-logged-in" style="display:none;">' +
    '<p><label>My Name:</label> <span id="userFullName"></span><br/>' +
    '<label>My Email Address:</label> <span id="userEmailAddress"></span><br/></p>' +
    '<p><button onclick="saveRequest()">RDP!</button></p>' +
    '</div>' +

    '</div>';

/*
  -----
  App State
  -----
*/
var map,
    infoWindow,
    isInfoWindowOpen = false,
    infoWindowCoordinates,
    userFullName,
    userEmailAddress,
    searchMarker;

/*
  -----
  Info window
  -----
*/
function createInfoWindow(e, content) {
    if (isInfoWindowOpen) return;
    infoWindow = new google.maps.InfoWindow({
        content: '<img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/West_Lafayette_High_School_logo.png" />' + content,
        position: {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
        },
				pixelOffset: new google.maps.Size(8,-26)
    });
    infoWindow.addListener('closeclick', function() {
        isInfoWindowOpen = false;
    });
    infoWindow.addListener('domready', drawInfoWindow);
		map.panTo({
				lat: e.latLng.lat(),
				lng: e.latLng.lng()
		});
		infoWindow.setOptions({disableAutoPan: true});
    infoWindow.open(map);
    isInfoWindowOpen = true;
    infoWindowCoordinates = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
    };
}

function drawInfoWindow() {
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            $('#infowindow-logged-in').show();
            $('#infowindow-not-logged-in').hide();
            if (!userFullName || !userEmailAddress) {
                FB.api("/me", {
                        locale: 'en_US',
                        fields: 'name, email'
                    },
                    function(response2) {
                        if (response2 && !response.error) {
                            userFullName = response2.name;
                            userEmailAddress = response2.email;
                            $("#userFullName").text(userFullName);
                            $("#userEmailAddress").text(userEmailAddress)
                        }
                    });
            }
            $("#userFullName").text(userFullName);
            $("#userEmailAddress").text(userEmailAddress)

        } else {
            FB.XFBML.parse(document.getElementById('request-infowindow'));
            $('#infowindow-not-logged-in').show();
            $('#infowindow-logged-in').hide();
        }
    });
}

function saveRequest() {
	var localFullName = userFullName;
	var localEmailAddress = userEmailAddress;
	if (!userFullName) {
		localFullName = $('#form_full_name').val();
		localEmailAddress = $('#form_email_address').val();
	}
    firebase.push({
        lat: infoWindowCoordinates.lat,
        lng: infoWindowCoordinates.lng,
        name: localFullName,
        emailAddress: localEmailAddress,
				address: '',
        isApproved: false,
				shouldAcknowledge: false
    });
		var latLng = new google.maps.LatLng(infoWindowCoordinates.lat, infoWindowCoordinates.lng);
		var marker = new google.maps.Marker({
				position: latLng,
				map: map,
				icon: 'images/pending.png'
		});

    infoWindow.close();
    isInfoWindowOpen = false;

    $("#requestSuccess").fadeIn();
    setTimeout(function() {
        $("#requestSuccess").fadeOut();
    }, 3000);

}

/*
  -----
  Map
  -----
 */
function initMap() {
    var mapElement = $("#map");
    map = new google.maps.Map(mapElement[0], {
        center: {
            lat: 40.452000,
            lng: -86.909707
        },
        zoom: 14,
				scrollwheel: false,
				disableDoubleClickZoom: true,
        mapTypeControl: false,
        streetViewControl: false
    });

		var publicConcertMarkers = [
			new google.maps.Marker({
				position: new google.maps.LatLng(40.451477, -86.910805),
				map: map,
				icon: 'images/drum-small.png',
				concertName: 'Silver Dipper Parking Lot'
			}),
			new google.maps.Marker({
				position: new google.maps.LatLng(40.458340, -86.910932),
				map: map,
				icon: 'images/drum-small.png',
				concertName: 'Lommel Park'
			})
		];

		publicConcertMarkers.map(function(marker) {
			marker.addListener('click', function() {
				createInfoWindow({
					latLng: {
						lat: marker.position.lat,
						lng: marker.position.lng
					}},
					'<h3>Public Concert</h3><p>' + marker.concertName + '</p>'
				);
			});
		});

    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places[0].geometry.location) {
            map.panTo(places[0].geometry.location);
            map.setZoom(16);
            if (searchMarker) {
                searchMarker.setMap(null);
            }

            searchMarker = new google.maps.Marker({
                position: places[0].geometry.location,
                map: map,
                title: 'Click to reserve'
            });
            searchMarker.addListener('click', function(e) {
							createInfoWindow(e, requestForm);
						});
        }
    });



    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

		var routeLayer = new google.maps.KmlLayer({
			url: 'http://www.westsidemarchathon.com/route.kml?cb=' + Math.random(),
			map: map
		});

    map.addListener('click', function(e) {
			if (isInfoWindowOpen) {
				infoWindow.close();
				isInfoWindowOpen = false;
			} else {
				createInfoWindow(e, requestForm);
			}
		});

    firebase.on("child_added", function(snapshot, prevChildKey) {
        var concertRequest = snapshot.val();
        var latLng = new google.maps.LatLng(concertRequest.lat, concertRequest.lng);
        var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: concertRequest.isApproved ?
                'images/approved.png' : 'images/dot.png'
        });
				marker.addListener('click', function() {
					createInfoWindow(
						{latLng: {lat: function(){return concertRequest.lat}, lng: function(){return concertRequest.lng}}}, concertRequest.shouldAcknowledge ?
							'<h3>' + concertRequest.name +'</h3><p>' + concertRequest.address + '</p>' :
							'<h3>Anonymous Donor</h3><p>' + concertRequest.address + '</p>');
				});
    });
}
