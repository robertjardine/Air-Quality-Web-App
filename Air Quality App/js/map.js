var map;
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
}

function updateLocation() {
    let lat = document.getElementById("lat").value;
    let long = document.getElementById("long").value;
    let particle = document.getElementById("particle").value;
    let amount = document.getElementById("amount").value;


    var latlng = new google.maps.LatLng(parseFloat(lat), parseFloat(long));
    map.setCenter(latlng); 
    //Get data for table (air-quality.js)
    getAirQuality(lat, long, particle, amount);
}