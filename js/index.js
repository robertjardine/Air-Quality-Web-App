var indexApp = angular.module('indexApp', []);

var markers = [];

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

    $scope.init = function() {
        var uluru = {lat: -34.397, lng: 150.644};
        $scope.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 8,
            center: uluru,
            scaleControl: true
        });

        $scope.geocoder = new google.maps.Geocoder;

        $scope.map.addListener('idle', function() {
            var lat = $scope.map.getCenter().lat();
            var lng = $scope.map.getCenter().lng();
            var latlng = {lat: lat, lng: lng};
            $scope.geocoder.geocode({'location': latlng}, function(results, status) {
                if (status === 'OK') {
                    if (results[0]) {
                        document.getElementById('pac-input').value=results[0].formatted_address;
                        $scope.airQualityRequest(lat + "," + lng, false);
                    } else {
                        window.alert('No results found');
                    }
                } else {
                    window.alert('Geocoder failed due to: ' + status);
                }
            });
        });

        /*$scope.map.addListener('zoom_changed', function() {
            var stuff = 1;
        });*/
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
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                var icon = {
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(25, 25)
                };

                // Create a marker for each place.
                markers.push(new google.maps.Marker({
                    map: $scope.map,
                    icon: icon,
                    title: place.name,
                    position: place.geometry.location
                }));

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            $scope.map.fitBounds(bounds);
            //this is where the coordinates need to be obtained and passed
            $scope.airQualityRequest(places[0].geometry.location.lat() + ',' + places[0].geometry.location.lng(), false);
        });
    };

    $scope.airQualityRequest = function (coordinates, historical) {
			//$scope.map.getCenter().lat();
			var bounds = $scope.map.getBounds();
			var NE = bounds.getNorthEast();
			var SW = bounds.getSouthWest();
			var distance = google.maps.geometry.spherical.computeDistanceBetween (NE, SW);
			var filter = getFilterInfo();
			// Clear out the old markers.
			markers.forEach(function (marker) {
				marker.setMap(null);
			});
			markers = [];
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
				   var newData = JSON.parse(JSON.stringify(data));
				   if (filter.length > 0) {
					   newData = filterData(newData, filter);
				   }
				   $scope.airQuality = newData.results;
				   $scope.$apply();
				   placeMarkers($scope.airQuality);
			   },
			   error: function () {
				   alert('error: request failed');
			   }
		   	});
    };

	$scope.submitRequest = function (historical) {
		var lat = $scope.map.getCenter().lat();
		var lng = $scope.map.getCenter().lng();
		$scope.airQualityRequest(lat + "," + lng, historical);
	};

    function getFilterInfo() {
		const tags = ['default', 'co', 'no2', 'o3', 'pm10', 'pm25', 'so2'];
    	var filter= [];
		for (var i=0; i<tags.length; i++) {
			var item = {};
			if ($('#' + tags[i])[0].checked) {
				item["name"] = tags[i];
				var index = $('#' + tags[i] + 'select')[0].selectedIndex;
				item["comparator"] = $('#' + tags[i] + 'select')[0].options[index].innerHTML;
				item["amount"] = $('#' + tags[i] + 'amount').val();
				filter.push(item);
			}
		}
		return filter;
	}

    function filterData(data, filter) {
		var filterNames = [];
    	for (var k=0; k<filter.length; k++) {
			filterNames.push(filter[k].name);
		}

    	var temp = data;
    	var filteredResults = data.results;
    	var results = data.results;
		for (var i=0; i<filteredResults.length; i++) {
			var measurements = filteredResults[i].measurements;
			var tempMeasure = measurements.slice();
			for (var j=0; j<measurements.length; j++) {
				var filterIndex = filterNames.indexOf(measurements[j].parameter);
				if (filterIndex !== -1) {

					if (filter[filterIndex].comparator === 'Greater Than') {
						if (measurements[j].value < filter[filterIndex].amount) {
							tempMeasure.splice(tempMeasure.indexOf(measurements[j]), 1);
						}
					} else if (filter[filterIndex].comparator === 'Less Than') {
						if (measurements[j].value > filter[filterIndex].amount) {
							tempMeasure.splice(tempMeasure.indexOf(measurements[j]), 1);
						}
					}
				} else {
					//remove measurement
					tempMeasure.splice(tempMeasure.indexOf(measurements[j]), 1);
				}
			}

			if (tempMeasure.length === 0) {
				results[i] = null;
			} else {
				results[i].measurements = tempMeasure;
			}
		}
		temp.results = results;
    	return temp;
	}

    function placeMarkers(results) {
        for (var i=0; i<results.length; i++) {
			var lat = results[i].coordinates.latitude;
			var lng = results[i].coordinates.longitude;
			var latlng = new google.maps.LatLng(parseFloat(lat),parseFloat(lng));

            var curr =
                new google.maps.Marker({
                    map: $scope.map,
                    position: latlng
                });
            if (markers.indexOf(curr) === -1) {
                markers.push(curr);
            }
        }
    }

});

function initFilterBody() {
	const tags = ['default', 'co', 'no2', 'o3', 'pm10', 'pm25', 'so2'];
	for (var i=0; i<tags.length; i++) {
		var checkBox =
			"<tr>" +
				"<td>" +
					"<div class='form-check'>" +
						"<input type='checkbox' class='form-check-input' id=" + tags[i] + ">" +
						"<label class='form-check-label' for=" + tags[i] + ">" + tags[i] + "</label>" +
					"</div>" +
				"</td>" +
				"<td>" +
					"<select id='" + tags[i] + "select'>" +
						"<option selected>Default</option>" +
						"<option>Greater Than</option>" +
						"<option>Less Than</option>" +
					"</select>" +
				"</td>" +
				"<td>" +
					"<input type='text' id='" + tags[i] + "amount' placeholder='Default input'>" +
				"</td>" +
			"</tr>";
		$("#filter-body").append(checkBox);
	}
}

function initCalendar() {
	 var date = new Date();
	 var month = date.getMonth();
	 var currDate = date.getDate();
	 var year = date.getFullYear();
	 $('#calendar-end').datepicker({});
	 $('#calendar-end').datepicker('disable');
	 $('#calendar-start').datepicker({
		minDate: new Date(year, month-3, currDate),
		maxDate: new Date(),
	  	onSelect: function(selectedDate) {
			$('#calendar-end').datepicker('option', 'minDate', selectedDate);
			$('#calendar-end').datepicker('option', 'maxDate', new Date());
			$('#calendar-end').datepicker('enable');
		 }
	 });
}