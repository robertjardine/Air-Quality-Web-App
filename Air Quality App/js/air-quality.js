
//Called by updateLocation() in map.js
function getAirQuality(lat, long, particle, amount) {
    let url = 'https://api.openaq.org/v1/measurements?coordinates=' + lat + ',' + long;

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var myObj = JSON.parse(this.responseText);
            for (let i=0; myObj.results.length; i++) {
                var currItem = myObj.results[i];
                getElement(currItem);
                //Need to still work on making this work for filtering
                //Have a particle
                // if (particle != 'Default') {
                //     if (particle == currItem.parameter) {
                //         //Have an amount
                //         if (amount && !isNaN(amount) && (amount >= currItem.amount)) {
                            
                //         } else {
                //             alert("Error");
                //         }
                //     }
                // } else {
                //     getElement();       
                // }

                //placeMarker();
            }
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function getElement(currItem) {
    var trElement = document.createElement("tr");
                
    trElement.appendChild(createTdElement(currItem.location));
    trElement.appendChild(createTdElement(currItem.date.local));
    trElement.appendChild(createTdElement(currItem.parameter));
    trElement.appendChild(createTdElement(currItem.value));
    trElement.appendChild(createTdElement(currItem.unit));

    document.getElementById("air-body").appendChild(trElement);
}

function createTdElement(param) {
    var el = document.createElement("td");
    el.innerHTML = param;
    return el;
}

//Add a marker to each measurement
function placeMarker() {
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: 'Hello World!'
      });
}