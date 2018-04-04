var indexApp = angular.module('indexApp', []);

indexApp.controller('IndexController', function PhoneListController($scope) {
    $scope.bounds = function(npad,spad,wpad,epad) {
        //I don't think we need this function
        var SW = $scope.map.getBounds().getSouthWest();
        var NE = $scope.map.getBounds().getNorthEast();
        var topRight = $scope.map.getProjection().fromLatLngToPoint(NE);
        var bottomLeft = $scope.map.getProjection().fromLatLngToPoint(SW);
        var scale = Math.pow(2, $scope.map.getZoom());

        var SWtopoint = $scope.map.getProjection().fromLatLngToPoint(SW);
        var SWpoint = new google.maps.Point(((SWtopoint.x - bottomLeft.x) * scale) + wpad, ((SWtopoint.y - topRight.y) * scale) - spad);
        var SWworld = new google.maps.Point(SWpoint.x / scale + bottomLeft.x, SWpoint.y / scale + topRight.y);
        var pt1 = $scope.map.getProjection().fromPointToLatLng(SWworld);

        var NEtopoint = $scope.map.getProjection().fromLatLngToPoint(NE);
        var NEpoint = new google.maps.Point(((NEtopoint.x - bottomLeft.x) * scale) - epad, ((NEtopoint.y - topRight.y) * scale) + npad);
        var NEworld = new google.maps.Point(NEpoint.x / scale + bottomLeft.x, NEpoint.y / scale + topRight.y);
        var pt2 = $scope.map.getProjection().fromPointToLatLng(NEworld);

        return new google.maps.LatLngBounds(pt1, pt2);
    };

    $scope.map;

    $scope.geocoder;

    $scope.searchBox;

    $scope.yep;

    $scope.init = function() {
        var uluru = {lat: -34.397, lng: 150.644};
        $scope.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 8,
            center: uluru,
            scaleControl: true
        });

        $scope.geocoder = new google.maps.Geocoder;

        $scope.map.addListener('dragend', function() {
            var lat = $scope.map.getCenter().lat();
            var lng = $scope.map.getCenter().lng();
            var latlng = {lat: lat, lng: lng};
            $scope.geocoder.geocode({'location': latlng}, function(results, status) {
                if (status === 'OK') {
                    if (results[0]) {
                        document.getElementById('pac-input').value=results[0].formatted_address;
                        $scope.airQualityRequest(lat + "," + lng);
                    } else {
                        window.alert('No results found');
                    }
                } else {
                    window.alert('Geocoder failed due to: ' + status);
                }
            });
        });
        // var marker = new google.maps.Marker({
        //     position: uluru,
        //     map: map
        // });

    };

    $scope.initSearchBox = function () {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        $scope.searchBox = new google.maps.places.SearchBox(input);
        $scope.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        // Bias the SearchBox results towards current map's viewport.
        $scope.map.addListener('bounds_changed', function() {
            $scope.searchBox.setBounds($scope.map.getBounds());
        });

        var markers = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        $scope.searchBox.addListener('places_changed', function() {
            var places = $scope.searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Clear out the old markers.
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers = [];

            //For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                // if (!place.geometry) {
                //     console.log("Returned place contains no geometry");
                //     return;
                // }
                // var icon = {
                //     url: place.icon,
                //     size: new google.maps.Size(71, 71),
                //     origin: new google.maps.Point(0, 0),
                //     anchor: new google.maps.Point(17, 34),
                //     scaledSize: new google.maps.Size(25, 25)
                // };
                //
                // // Create a marker for each place.
                // markers.push(new google.maps.Marker({
                //     map: map,
                //     icon: icon,
                //     title: place.name,
                //     position: place.geometry.location
                // }));

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            $scope.map.fitBounds(bounds);
            //this is where the coordinates need to be obtained and passed
            $scope.airQualityRequest(places[0].geometry.location.lat() + ',' + places[0].geometry.location.lng());
            //for testing
            yep = $scope.bounds(0,0,0,0);
        });
    };

    $scope.airQualityRequest = function (coordinates) {
        //$scope.map.getCenter().lat();
        var bounds = $scope.map.getBounds();
        var NE = bounds.getNorthEast();
        var SW = bounds.getSouthWest();
        var distance = google.maps.geometry.spherical.computeDistanceBetween (NE, SW);
        send = {
            coordinates: coordinates,
            radius: distance/2
        };
        $.ajax({
            url: 'https://api.openaq.org/v1/latest',
            data: send,
            type: 'GET',
            cache: false,
            contentType: "application/json; charset=utf-8",
            success: function (data) {
                $scope.airQuality = data.results;
                $scope.$apply()
            },
            error: function () {
                alert('error');
            }
        });
    };

    //Filter when a new option is selected
    $("#particle").change(filterParticle);
    $("#amount").bind('input', filterParticle);

    function filterParticle() {
        var amountValue = $("#amount").val();
        amountValue = (amountValue || !isNaN(amountValue)) ? amountValue : 0;
        var particleValue = $("#particle").val();

        $("#air-body > tr").show();
        $("#air-body > tr").each(function() {
            var currAmount = $(this).find("td").eq(3).html();
            var currParticle = $(this).find("td").eq(2).html();

            if (particleValue == 'Default') {
                if (amountValue > currAmount) {
                    $(this).hide();
                    //Get matching marker and hide from map
                    //marker.setVisible(false);
                }
            } else if ((particleValue != currParticle) ||((particleValue == currParticle) && (amountValue > currAmount))) {
                $(this).hide();
                //Get matching marker and hide from map
                //marker.setVisible(false);
            }
        });
    }
});