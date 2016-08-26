var firebase = new Firebase("https://encoded-road-138721.firebaseio.com/");
var requestForm = '<div id="request-infowindow">' +

    '<h4 id="firstHeading" class="firstHeading">Request a personal concert!</h4>' +
    '<div id="bodyContent">' +

    '<div id="infowindow-not-logged-in" style="display:none;">' +
    '<p>Please log into Facebook.<br/>We will collect your name and email address and get in touch with you shortly</p>' +
    '<div class="fb-login-button" data-max-rows="1" data-size="medium" data-show-faces="false" data-auto-logout-link="false" data-scope="public_profile,email" onlogin="drawInfoWindow();"></div>' +
    '</div>' +

    '<div id="infowindow-logged-in" style="display:none;">' +
    '<span>My Name: </span><span id="userFullName"></span><br/>' +
    '<span>My Email Address: </span><span id="userEmailAddress"></span><br/>' +
    '<button onclick="saveRequest()">Reserve my concert!</button>' +
    '</div>' +

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
function createInfoWindow(e) {
    if (infoWindowOpen) return;
    infoWindow = new google.maps.InfoWindow({
        content: requestForm,
        position: {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
        }
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
        approved: false
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
            searchMarker.addListener('click', createInfoWindow);
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

    map.addListener('click', createInfoWindow);

    firebase.on("child_added", function(snapshot, prevChildKey) {
        var newPosition = snapshot.val();
        var latLng = new google.maps.LatLng(newPosition.lat, newPosition.lng);
        var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: newPosition.approved ?
                'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
        });
    });
}
