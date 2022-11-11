
let capture;
let weather;
let temperatures;
let aspectRatio;
let alcFont;

function preload(){
    let url = 'https://api.weather.gov/gridpoints/TOP/48,32/forecast';
    httpGet(url, 'json',false, function(response){
        weather = response;
        console.log(weather);
    });
    alcFont = loadFont('fonts/Alcubierre.otf');
}

function setup(){
    createCanvas(windowWidth-20, windowHeight-20);

    capture = createCapture(VIDEO);
    aspectRatio = 9 / 16;
    capture.size(round((windowWidth-20)*aspectRatio),(windowWidth-20));
    capture.hide();
    while(!weather){
        textFont(alcFont);
        textSize(48);
        text("Welcome", capture.width/2,capture.height/2);
    }
    weatherArr = getWeather();
}

function draw(){
    displayCam();

} 

function displayCam(){
    push();
    translate(width,0);
    scale(-1, 1);
    image(capture, 0, 0);
    pop();
}

function getWeather(){
    const temps = [];
    for (let i = 0; i < weather.properties.periods.length;i++){
        let temperature = weather.properties.periods[i].temperature.concat(weather.properties.periods[i].temperatureUnits);
        let time = convertTime(weather.properties.periods[i].startTime);

        temps.push([temperature,time]);
    }
    return temps;
}

function convertTime(time){
        let strTime = time.split("T")[1].substr(0,5);
        let hour = parseInt(strTime.split(":")[0]);
        let min = parseInt(strTime.split(":")[1]);
        let period = 'AM';

        if(hour > 12){
            hour = hour - 12;
            period = 'PM';
        } else if (hour == 12){
            period = 'PM';
        } else if(hour == 0){
            hour = 12;
        }

        if(min < 10)
            min = "0".concat(min);

        return hour.toString().concat(":",min,period);
}