let capture;
let weather;
let weatherURL;
let temperatures;
let news;
let stories;
let events;
let upcomingEvents;

let alcFont;
let start;
let lastRequest;
let curTime;
let curDate;

let mode = 0;
let i = 0;

function preload(){
    // API Request to get the weather
    weatherURL = 'https://api.weather.gov/gridpoints/TOP/48,32/forecast';
    httpGet(weatherURL, 'json',false, function(response){
        weather = response;
    });
    alcFont = loadFont('fonts/Alcubierre.otf');

    // Load JSON files for news and personal events
    loadJSON('docs/events.json','json', function(response){
        events = response;
    });

    loadJSON('docs/news.json','json', function(response){
        news = response;
    });
}

function setup(){
    createCanvas(windowWidth-20, windowHeight-20);
    rectMode(CORNER);

    capture = createCapture(VIDEO);
    capture.size(windowWidth-20,windowHeight-20);
    capture.hide();
    console.log(windowWidth-20,windowHeight-20);
    start = millis();
    lastRequest = millis();
    curDate = getDate();
    upcomingEvents = readEvents();
    stories = readNews();
    console.log(upcomingEvents);
}

function draw(){
    // HACK: Get the proper time by seemingly putting it in ISO8601 and using our function to convert it.
    curTime = "T".concat(hour(),":",minute());
    curTime = convertTime(curTime);
    

    // Speeds for transitioning start screen
    let floatSpeed = 3.5;
    let fadeSpeed = 0.2;
    
    // Start screen takes 5s as to let the API requests make their returns
    if(millis()-start < 5000 || !weather){
        background(100);
        textFont(alcFont);
        textSize(48);
        textAlign(CENTER);
        fill(255);
        text("Welcome", capture.width/2,capture.height/2);
        text(curTime, capture.width/2,capture.height/2+50);
        
        // Don't transition unless we have weather data.
        // Send another request if there wasn't one in the last 10 seconds.
        if(!weather && millis()-lastRequest > 10000){
            httpGet(weatherURL, 'json',false, function(response){
                weather = response;
            });
            lastRequest = millis();
        }
        return; 

    // Mode indicates whether the screen has finished transitioning.
    }else if(mode == 0){
        displayCam();
        background(100-i,150-i*fadeSpeed);
        
        textSize(48);
        textAlign(CENTER);
        fill(255);
        text("Welcome", capture.width/2,capture.height/2-i*floatSpeed);
        text(curTime, capture.width/2,capture.height/2+50-i*floatSpeed);

        // Once the 'Welcome' text has disappeared, we have finished transition.
        if(capture.height/2-i*floatSpeed < 0){
            mode = 1;
        }
        i++;
        return;
    }  
    
    // Base mirror
    displayCam();
    background(100-i,150-i*fadeSpeed);
    
    strokeWeight(1);
    line(20,55,capture.width-20,55);
    stroke(255);
    
    textSize(48);
    textAlign(CENTER);
    fill(255);
    strokeWeight(0);
    text(curTime, capture.width/2,capture.height/2+50-i*floatSpeed);

    temperatures = getWeather();
    drawCalendar(10,500,upcomingEvents);
    
} 

// Method for displaying the webcam and flipping it so that it appears like a mirror.
function displayCam(){
    push();
    translate(width,0);
    scale(-1, 1);
    image(capture, 0, 0,windowWidth-20,windowHeight-20);
    pop();
}

// Parsing the API return to store the temperatures in an array
function getWeather(){
    const temps = [];
    for (let i = 0; i < weather.properties.periods.length;i++){
        let date = weather.properties.periods[i].name;

        // We're only focused on day time temps.
        if (weather.properties.periods[i].isDayTime){
            let tempNum = weather.properties.periods[i].temperature;
            let temperature = "".concat(tempNum,weather.properties.periods[i].temperatureUnits);
            let desc = weather.properties.periods[i].shortForecast;
            
            temps.push([temperature,date,desc]);
        }

    }
    return temps;
}

// Convert time from ISO8601 to 12-hour notation.
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

        return hour.toString().concat(":",min," ",period);
}

// Simple fucntion for getting the current date and formatting it in ISO8601
function getDate(){
    let date = "".concat(year(),"-");

    if(month()<10)
        date = "".concat(date,"0");
    date = "".concat(date, month(),"-");

    if(day()<10)
        date = "".concat(date,"0");
    date = "".concat(date,day());

    return date;
}

// Method for comparing two dates
// If it returns 1, the first date is before the second date
// 0 means they are the same
// -1 means the first date is after the second date
function compareDates(d1, d2){
    var date1 = Date.parse(d1);
    var date2 = Date.parse(d2);
    if(date1 < date2){
        return 1;
    } else if(date1 == date2){
        return 0;
    }
    return -1;
}

// Parsing the JSON response and putting it into an array to read.
function readEvents(){
    const eventsArr = []
    for(let i = 0; i < events.events.length; i++){
        // Check the current date and only append today's events.
        if(compareDates(curDate,events.events[i].date) == 0){
            eventsArr.push([events.events[i].title,events.events[i].time]);
        }
    }
    return eventsArr;
}

// Parsing the JSON response and putting it into an array to read.
function readNews(){
    const newsAr = []
    for(let i = 0; i < news.stories.length; i++){
        // Check the current date and only append upcoming events.
        if(compareDates(curDate,news.stories[i].date) == 1){
            newsAr.push([news.stories[i].title,news.stories[i].date]);
        }
    }
    return newsAr;
}

function drawCalendar(posX, posY, upcomingEvents){
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    textAlign(LEFT);
    textSize(32);
    fill(255);
    strokeWeight(0);
    text("Events",posX+10,posY+40);
    fill(175);
    textAlign(RIGHT);
    text(months[month()-1] +'. '+ day(),posX+380,posY+40);
    
    
    strokeWeight(2);
    line(posX+10,posY+50,posX+380,posY+50);
    stroke(255);
    
    
    if(upcomingEvents.length==0){
      fill(150);
      textSize(20);
      textAlign(LEFT);
      strokeWeight(0);
      text("You have no more events for today",posX+10,posY+80);
      return;
    }
    
    for(let i = 0;i<upcomingEvents.length;i++){
      fill(225);
      textSize(24);
      strokeWeight(0);
      textAlign(LEFT);
      text(upcomingEvents[i][0],posX+10,posY+80+i*40);
      textAlign(RIGHT);
      fill(150);
      text(upcomingEvents[i][1],posX+380,posY+80+i*40);
    }
    
  }