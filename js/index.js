var indexApp = angular.module('indexApp', []);

var markers = [];

indexApp.controller('IndexController', function PhoneListController($scope) {

    $scope.map;

    $scope.geocoder;

    $scope.searchBox;

    $scope.isLatest;

    $scope.pointsArray = [];

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
                        $scope.airQualityRequest(lat + "," + lng);
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

            //For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                /*var icon = {
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
                }));*/

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
        });
    };

    $scope.airQualityRequest = function (coordinates) {
        // Clear out the old markers.
        markers.forEach(function (marker) {
            marker.setMap(null);
        });
        markers = [];

        if($scope.markerCluster !== undefined) {
            // Clears all clusters and markers from the clusterer.
            $scope.markerCluster.clearMarkers();
        }

        $scope.pointsArray = [];

        $scope.isLatest = $scope.checkIfLatest();

        var bounds = $scope.map.getBounds();
        var NE = bounds.getNorthEast();
        var SW = bounds.getSouthWest();
        var distance = google.maps.geometry.spherical.computeDistanceBetween (NE, SW);
        var filter = getFilterInfo();
        var url;
        var send;

        if($scope.isLatest) {
            url = 'https://api.openaq.org/v1/latest';
            send = {
                coordinates: coordinates,
                radius: distance/2,
                limit: 10000
            };
        } else {
            url = 'https://api.openaq.org/v1/measurements?date_from='+$("#calendar-start").val()+"&date_to="+$("#calendar-end").val();
            send = {
                coordinates: coordinates,
                radius: distance/2,
                limit: 10000
                //date_from: $("#calendar-start").val(),
                //date_to: $("#calendar-end").val()
            };
        }
        if($scope.isLatest) {
            $.ajax({
                url: url,
                data: send,
                type: 'GET',
                cache: false,
                contentType: "application/json; charset=utf-8",
                success: function (data) {
                    var newData = JSON.parse(JSON.stringify(data));
                    newData = filterData(newData, filter);
                    $scope.airQuality = newData.results;
                    $scope.$apply();
                    $scope.placeMarkers($scope.airQuality);
                },
                error: function (error) {
                    alert('error: request failed, sorry, but the https://docs.openaq.org/#api-Measurements api is a dumpster fire. Please turn off the history filter.');
                }
            });
        } else {
            var input = "{\"results\":[{\"location\":\"St Marys\",\"parameter\":\"pm25\",\"date\":{\"utc\":\"2018-04-05T00:00:00.000Z\",\"local\":\"2018-04-05T10:00:00+10:00\"},\"value\":5.3,\"unit\":\"µg/m³\",\"coordinates\":{\"latitude\":-33.7972222,\"longitude\":150.7658333},\"country\":\"AU\",\"city\":\"Sydney North-west\"},{\"location\":\"Bathurst\",\"parameter\":\"pm10\",\"date\":{\"utc\":\"2018-04-05T00:00:00.000Z\",\"local\":\"2018-04-05T10:00:00+10:00\"},\"value\":17.9,\"unit\":\"µg/m³\",\"coordinates\":{\"latitude\":-33.4033333,\"longitude\":149.5733333},\"country\":\"AU\",\"city\":\"Central Tablelands\"}]}";
            var newData = JSON.parse(input);
            newData = filterData(newData, filter);
            $scope.airQuality = newData.results;
            $scope.placeMarkers($scope.airQuality);
        }
    };

	$scope.submitRequest = function () {
		var lat = $scope.map.getCenter().lat();
		var lng = $scope.map.getCenter().lng();
		$scope.airQualityRequest(lat + "," + lng);
	};

    function getFilterInfo() {
		const tags = ['co', 'no2', 'o3', 'pm10', 'pm25', 'so2'];
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
        if($scope.isLatest) {
            for (var i = 0; i < filteredResults.length; i++) {
                var measurements = filteredResults[i].measurements;
                var tempMeasure = measurements.slice();
                for (var j = 0; j < measurements.length; j++) {
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
        } else {
            var tempMeasure = filteredResults.slice();
            for (var i = 0; i < filteredResults.length; i++) {
                var filterIndex = filterNames.indexOf(filteredResults[i].parameter);
                if (filterIndex !== -1) {

                    if (filter[filterIndex].comparator === 'Greater Than') {
                        if (filteredResults[i].value < filter[filterIndex].amount) {
                            tempMeasure.splice(tempMeasure.indexOf(filteredResults), 1);
                        }
                    } else if (filter[filterIndex].comparator === 'Less Than') {
                        if (filteredResults[i].value > filter[filterIndex].amount) {
                            tempMeasure.splice(tempMeasure.indexOf(filteredResults), 1);
                        }
                    }
                } else {
                    //remove measurement
                    tempMeasure.splice(tempMeasure.indexOf(filteredResults), 1);
                }
                if (tempMeasure.length === 0) {
                    results = null;
                } else {
                    results = tempMeasure;
                }
            }
        }
        temp.results = results;
        return temp;
	}

    $scope.placeMarkers = function(results) {
        for (var i=0; i<results.length; i++) {
            if (results[i] !== null) {
                var lat = results[i].coordinates.latitude;
                var lng = results[i].coordinates.longitude;
                var latlng = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
                if ($scope.isLatest) {
                    $scope.pointsArray.push({location: latlng, weight: results[i].measurements[0].value});
                } else {
                    $scope.pointsArray.push({location: latlng, weight: results[i].value});
                }
                var curr =
                    new google.maps.Marker({
                        map: $scope.map,
                        position: latlng,
                        title: "Lat: " + lat + ", Lng: " + lng
                    });
                var currInfo = "";
                if ($scope.isLatest) {
                    var currMeasurements = results[i].measurements;
                    for (var j = 0; j < currMeasurements.length; j++) {
                        currInfo += "<p>" +
                            currMeasurements[j].parameter + ": " +
                            currMeasurements[j].value + " " +
                            currMeasurements[j].unit +
                            "</p>" +
                            "<hr/>";
                    }
                } else {
                    var elementMeasurements = results[i];
                    currInfo += "<p>" +
                        elementMeasurements.parameter + ": " +
                        elementMeasurements.value + " " +
                        elementMeasurements.unit +
                        "</p>" +
                        "<hr/>";
                }
                curr.info = new google.maps.InfoWindow({
                    content: currInfo
                });
                google.maps.event.addListener(curr, 'mouseover', function () {
                    this.info.open($scope.map, this);
                });
                google.maps.event.addListener(curr, 'mouseout', function () {
                    this.info.close();
                });
                if (markers.indexOf(curr) === -1) {
                    markers.push(curr);
                }
            }
        }
        $scope.markerCluster = new MarkerClusterer($scope.map, markers, {
            imagePath: 'images/m'
        });
        if($scope.heatmap !== undefined) {
            $scope.heatmap.setMap(null);
        }
        $scope.heatmap = new google.maps.visualization.HeatmapLayer({
            data: $scope.pointsArray,
            map: $scope.map
        });
        $scope.heatmap.setMap(null);
    };

    $scope.toggleHeatmap = function() {
        if($scope.checkForOneParticleFilter()) {
            $scope.heatmap.setMap($scope.heatmap.getMap() ? null : $scope.map);
        } else {
            window.alert('You must only have one particle selected to view the heat map.');
        }
    };

    $scope.checkForOneParticleFilter = function () {
        var filters = getFilterInfo();
        return (filters.length === 1);
    };

    $scope.checkIfLatest = function () {
        var startDate = $("#calendar-start");
        var endDate = $("#calendar-end");
        var actualStartDate = startDate.val();
        var actualEndDate = endDate.val();
        var currentDate = $.datepicker.formatDate('mm/dd/yy', new Date());
        if(actualEndDate === undefined || (actualEndDate === actualStartDate && actualStartDate === currentDate)){
            return true;
        } else {
            return false;
        }
    };
});

function initFilterBody() {
	const tags = ['co', 'no2', 'o3', 'pm10', 'pm25', 'so2'];
	for (var i=0; i<tags.length; i++) {
		var checkBox =
			"<tr>" +
				"<td>" +
					"<div class='form-check'>" +
						"<input type='checkbox' class='form-check-input' checked id=" + tags[i] + " onchange='enableSelect(this)'>" +
						"<label class='form-check-label' for=" + tags[i] + ">" + tags[i] + "</label>" +
					"</div>" +
				"</td>" +
				"<td>" +
					"<select id='" + tags[i] + "select' onchange='enableAmount(this)'>" +
						"<option selected>Default</option>" +
						"<option>Greater Than</option>" +
						"<option>Less Than</option>" +
					"</select>" +
				"</td>" +
				"<td>" +
					"<input type='text' id='" + tags[i] + "amount' value='0' disabled>" +
				"</td>" +
			"</tr>";
		$("#filter-body").append(checkBox);
	}
}

function enableSelect(el) {
	if(el.checked) {
		$('#' + el.id + 'select').prop("disabled", false);
	} else {
		$('#' + el.id + 'select').prop("disabled", true);
	}
}

function enableAmount(el) {
	var amountEl = el.id.substring(0, el.id.indexOf("select"));
	amountEl += 'amount';
	if (el.selectedIndex > 0) {
		$('#' + amountEl).prop("disabled", false);
	} else {
		$('#' + amountEl).prop("disabled", true);
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