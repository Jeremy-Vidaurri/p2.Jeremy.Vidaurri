let capture;

let weather;
let weatherURL;
let weatherIcon;
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

let weight;
let delta;

let transition = false;
let mode = true;
let light;
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
    weatherIcon = loadImage('img/weather.png');
    light = createImg('img/light.png',"power");
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
    
    weight = round(random(130,160));
    delta = round(random(1,5));

    // Color picker needs to exist for the light mode, but by default hide it.
    colorPicker = createColorPicker('#FFFFFF');
    colorPicker.hide();

}

function draw(){
    // HACK: Get the proper time by seemingly putting it in ISO8601 and using our function to convert it.
    curTime = "T".concat(hour(),":",minute());
    curTime = convertTime(curTime);
    

    // Speeds for transitioning start screen
    let floatSpeed = 3.5;
    let fadeSpeed = 0.1;
    
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
    }else if(!transition){
        displayCam();
        background(100-i,180-i*fadeSpeed);
        
        textSize(48);
        textAlign(CENTER);
        fill(255);
        text("Welcome", capture.width/2,capture.height/2-i*floatSpeed);
        text(curTime, capture.width/2,capture.height/2+50-i*floatSpeed);

        // Once the 'Welcome' text has disappeared, we have finished transition.
        if(capture.height/2-i*floatSpeed < 0){
            transition = true;
        }
        i++;
        return;
    }  
    
    // Base mirror
    displayCam();
    background(100-i,180-i*fadeSpeed);

    temperatures = getWeather();
    if(mode){
        textSize(48);
        textAlign(CENTER);
        fill(255);
        strokeWeight(0);
        text(curTime, capture.width/2,capture.height/2+50-i*floatSpeed);

        textSize(32);
        text("Current Weight:", capture.width/2,capture.height-50);
        text(weight+" lbs" + " (+"+ delta +" lbs)",capture.width/2,capture.height-20);
        drawCalendar(10,600,upcomingEvents);
        drawNews(10,100,stories);
        drawWeather(capture.width-400,100,temperatures); 
        light.position(capture.width-100,capture.height-100);
    } else{
        noFill();
        strokeWeight(75);
        stroke(colorPicker.color());
        rect(0,0,capture.width,capture.height);
        strokeWeight(0);
        colorPicker.show();
        colorPicker.position(capture.width-160,capture.height-85);
        
        
    }
    light.mousePressed(function(){mode = !mode});
    
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
    for (let i = 0; i < 8;i+=2){
        // The way the JSON is formatted, the high is given and then the next entry has the low. 
        let high = weather.properties.periods[i].temperature;
        let tempHigh = "".concat(high,weather.properties.periods[i].temperatureUnit);
        let low = weather.properties.periods[i+1].temperature;
        let tempLow = "".concat(low,weather.properties.periods[i+1].temperatureUnit);
        
        let date = weather.properties.periods[i].name;
        if(date == 'Tonight'){
            i--;
        }
            

        temps.push([tempHigh,tempLow,date]);
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
    const eventsArr = [];
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
    const newsArr = [];
    for(let i = 0; i < news.articles.length; i++){
        // Check the current date and only append upcoming events.
        let newsDate = news.articles[i].publishedAt;
        newsDate = newsDate.substring(0,9);
        let title = news.articles[i].title;
        let publisher = title.slice(title.lastIndexOf('-')+1);
        title = title.slice(0,title.lastIndexOf('-'));


        newsArr.push([title,publisher,newsDate]);
    }
    return newsArr;
}

// Draw today's events 
function drawCalendar(posX, posY, upcomingEvents){
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    textAlign(LEFT);
    textSize(32);
    fill(255);
    strokeWeight(0);
    text("EVENTS",posX+10,posY+40);
    fill(175);
    textAlign(RIGHT);
    text(months[month()-1] +'. '+ day(),posX+380,posY+40);
    
    
    strokeWeight(2);
    line(posX+10,posY+50,posX+380,posY+50);
    stroke(255);
    
    
    if(upcomingEvents.length==0){
      fill(180);
      textSize(22);
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
      fill(180);
      text(upcomingEvents[i][1],posX+380,posY+80+i*40);
    }
    
}

// Draw the weather for the week
function drawWeather(posX, posY, temperatures){
    var days = {
      "Monday":"Mon",
      "Tuesday":"Tues",
      "Wednesday":"Wed",
      "Thursday":"Thur",
      "Friday":"Fri",
      "Saturday":"Sat",
      "Sunday":"Sun"
    };
    
    fill(255);
    strokeWeight(0);

    textSize(24);
    textAlign(LEFT);
    text("Lubbock,TX",posX+10,posY+40);


    image(weatherIcon,posX+20,posY+110,80,80);
    textSize(62);
    text(temperatures[0][0],posX+10,posY+100);

    textSize(24);
    fill(180);
    textAlign(RIGHT);
    text(weather.properties.periods[0].detailedForecast,posX+175,posY+40,200,200);

    fill(255);
    text("H:",posX+40,posY+300);
    fill(180);
    text("L:",posX+40,posY+340);

    // Skip today's weather and show the next three days.
    for(let i=1;i<4;i++){
        textAlign(CENTER);
        // Date
        fill(180);
        text(days[temperatures[i][2]], posX+20+i*100,posY+270);
        // High
        fill(255);
        text(temperatures[i][0],posX+20+i*100,posY+300);
        // Low
        fill(180);
        text(temperatures[i][1],posX+20+i*100,posY+340);
    }
}

// Draw the latest news
function drawNews(posX,posY,stories){
    textAlign(LEFT);
    textSize(32);
    fill(255);
    strokeWeight(0);
    text("NEWS",posX+10,posY+40);

    strokeWeight(2);
    line(posX+10,posY+50,posX+380,posY+50);
    stroke(255);

    for(let i=0; i<3; i++){
        fill(180);
        textSize(20);
        strokeWeight(0);
        text(stories[i][1],posX,posY+80+i*100);

        textSize(24);
        fill(255);
        text(stories[i][0],posX+10,posY+110+i*100,350,100);

    }
}