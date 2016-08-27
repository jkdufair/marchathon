var firebase = new Firebase("https://encoded-road-138721.firebaseio.com/");
var requestForm = '<div id="request-infowindow">' +

    '<h3>Request a concert!</h3>' +

    '<div id="infowindow-not-logged-in" style="display:none;">' +
    '<p>Please log into Facebook.<br/>We will collect your name and email address and get in touch with you shortly</p>' +
    '<div class="fb-login-button" data-max-rows="1" data-size="medium" data-show-faces="false" data-auto-logout-link="false" data-scope="public_profile,email" onlogin="drawInfoWindow();"></div>' +
    '</div>' +

    '<div id="infowindow-logged-in" style="display:none;">' +
    '<p><label>My Name:</label> <span id="userFullName"></span><br/>' +
    '<label>My Email Address:</label> <span id="userEmailAddress"></span><br/></p>' +
    '<p><button onclick="saveRequest()">Reserve my concert!</button></p>' +
    '</div>' +

    '</div>';

/*
  -----
  App State
  -----
*/
var map,
    infoWindow,
    infoWindowOpen = false,
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
    if (infoWindowOpen) return;
    infoWindow = new google.maps.InfoWindow({
        content: content,
        position: {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
        },
				pixelOffset: new google.maps.Size(8,-26)
    });
    infoWindow.addListener('closeclick', function() {
        infoWindowOpen = false;
    });
    infoWindow.addListener('domready', drawInfoWindow);
    infoWindow.open(map);
    infoWindowOpen = true;
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
    firebase.push({
        lat: infoWindowCoordinates.lat,
        lng: infoWindowCoordinates.lng,
        name: userFullName,
        emailAddress: userEmailAddress,
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
    infoWindowOpen = false;

    $("#requestSuccess").fadeIn();
    setTimeout(function() {
        $("#requestSuccess").fadeOut();
    }, 10000);

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
            lat: 40.45313,
            lng: -86.909707
        },
        zoom: 14,
				scrollwheel: false,
				disableDoubleClickZoom: true,
        mapTypeControl: false,
        streetViewControl: false
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

    var marchRouteLine = new google.maps.Polyline({
        path: marchRoute,
        clickable: false,
        strokeColor: '#FF0000',
        strokeWeight: 4
    });

    marchRouteLine.setMap(map);

    map.addListener('click', function(e) {
			createInfoWindow(e, requestForm);
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
					createInfoWindow({latLng: {lat: function(){return concertRequest.lat}, lng: function(){return concertRequest.lng}}}, '<h3>'+ concertRequest.name +'</h3><p>' + concertRequest.address + '</p>');
				});
    });
}
