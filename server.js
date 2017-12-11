// NPM Docs: https://www.npmjs.com/package/nightmare
// Github Repo: https://github.com/segmentio/nightmare#api
// UI Testing Blog Post: https://segment.com/blog/ui-testing-with-nightmare/
// Nightmare Examples: https://github.com/rosshinkley/nightmare-examples
// Window Options: https://github.com/electron/electron/blob/master/docs/api/browser-window.md#new-browserwindowoptions

var fs = require('fs');
var url = require('url');
var rmdir = require('rmdir');
var mkdirp = require('mkdirp');
var express = require('express');
var zip = require('node-zip-dir');
var Nightmare = require('nightmare');

// Global vars
var url, saveDir;

// Set up the Server
var app = express();
var port = process.env.PORT || 8080;

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Because the .htaccess file looked two directories up
// On GoDaddy use /services/shutterbug/:protocol/:url
app.use('/:protocol/:url', function(req, res){
    if(!req.params.protocol || !req.params.url){
        res.send('Sorry, this is an invalid path/URL. Please use scheme ../protocol/url');
    }
    else{
        res.set({'Content-Type': 'application/zip'});
        
        // Create custom token '@' to accept subdirectory requests
        var tempUrl = req.params.url.replace(/@/gi,'/');
        url = req.params.protocol + '://' + tempUrl;
        
        // Check for our directory, otherwise create it
        saveDir = 'screenshots/' + url.replace(/[^a-zA-Z0-9]/gi, '-').replace(/^https?-+/, '') + '/';

        // Check for our directory, otherwise create it
        mkdirp(saveDir, function(err){ if(err) console.error(err) });

        // Then begin our main program
        console.log('Request received at ' + Date.now());
        console.log('Testing ' + url + '...');

        loop(url, res);
    }
    
});

app.use('/', function(req, res){
    res.send('Welcome to Shutterbug! Please use scheme ../protocol/url to send a request url');
});

app.use('*', function(req, res){
    res.send('Sorry, the requested resource could not be found. \nPlease use the scheme ../protocol/url to send a request url');
});

// Listen on active port
app.listen(port, function(){
    console.log('Listening on port ' + port);
});


// Object of device info
var devices = [
    {
        name: 'iPhone 5',
        width: 320,
        height: 568,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
    },
    {
        name: 'iPhone 6',
        width: 375,
        height: 667,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
    },
    {
        name: 'iPhone 6 Plus',
        width: 414,
        height: 736,
        type: 'mobile',
        zoomFactor: '3',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
    },
    {
        name: 'iPad',
        width: 768,
        height: 1024,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
    },
    {
        name: 'iPad Pro',
        width: 1024,
        height: 1366,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
    },
    {
        name: 'Galaxy S5',
        width: 360,
        height: 640,
        type: 'mobile',
        zoomFactor: '3',
        userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Mobile Safari/537.36'
    },
    {
        name: 'Nexus 6P',
        width: 360,
        height: 640,
        type: 'mobile',
        zoomFactor: '3.5',
        userAgent: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Mobile Safari/537.36'
    },
    {
        name: 'Nexus 7',
        width: 600,
        height: 960,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    },
    {
        name: 'Nexus 10',
        width: 800,
        height: 1280,
        type: 'mobile',
        zoomFactor: '2',
        userAgent: 'Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    },
    {
        name: 'Laptop - Chrome',
        width: 1280,
        height: 800,
        type: 'web',
        zoomFactor: '1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    },
    {
        name: 'Desktop - Chrome',
        width: 1920,
        height: 949,
        type: 'web',
        zoomFactor: '1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    }
];

// Loop through our device list and run the program
function loop(url, res){
    console.log('Entering loop...');
    
    var counter = 0;
    devices.forEach(function(device){
        var globalDistance = 0;
        var globalInterval = 0;

        // Declare our use() functions
        var hideScrollBar = function() {
            console.log('Hiding scrollbar');
            
            return function(shutterbug){
                shutterbug
                    .evaluate(function(){
                        document.body.style.overflow = 'hidden'; 
                    });    
            }
        };

        var getDimensions = function(){
            return function (shutterbug) {
                console.log('Getting dimensions');
                
                shutterbug
                    .evaluate(function () {
                        var windowWidth = window.innerWidth;
                        var windowHeight = window.innerHeight;
                        var bodyHeight = document.querySelector('body').scrollHeight;
                        return {
                            windowWidth: windowWidth,
                            windowHeight: windowHeight, 
                            bodyHeight: bodyHeight
                        };
                    })
            };
        };

        var shutter = function(){
            return function(shutterbug){
                console.log(device.name + ' Shuttering..');

                // Excude the scrollbar from the screenshot
                shutterbug.screenshot(saveDir + device.name + '.png', {x: 0, y: 0, width: device.width, height: device.height});
                shutterbug.use(function(shutterbug){
                    console.log(device.name + ' distance: ' + globalDistance);
                    console.log(device.name + ' interval: ' + globalInterval);

                    var location = globalDistance;
                    for(var i = 0; i < globalInterval; i++){
                        var path = saveDir + device.name + '-' + (i + 2) + '.png';

                        shutterbug.scrollTo(location, 0).screenshot(path, {x: 0, y: 0, width: device.width, height: device.height});

                        location += globalDistance;
                    }
                })
            }
        };

        // Declare our instance of nightmare with device-based options
        // Set show to true to watch the browser window in action
        var shutterbug = new Nightmare({show: false, width: device.width, x: 0, height: device.height, y: 0, useContentSize: true, resizeable: true, enableLargerThanScreen: true, webPreferences: {zoomFactor: device.zoomFactor} });

        shutterbug
            .useragent(device.userAgent)
            .goto(url)
            .wait(1000)
            .use(hideScrollBar())
            .then(function(){
                shutterbug.use(getDimensions())
                .then(function(result){
                    var windowWidth = result.windowWidth;
                    var windowHeight = result.windowHeight;
                    var bodyHeight = result.bodyHeight;

                    console.log(device.name + ' window: ' + windowWidth + 'x' + windowHeight);
                    console.log(device.name + ' body height: ' + bodyHeight);

                    // Subtract 10 so there's overlap in screenshots
                    globalDistance = (windowHeight - 10);
                    globalInterval = Math.ceil(bodyHeight / globalDistance);

                    shutterbug.use(shutter())
                    .end()
                    .then(function(){
                        counter++;
                        console.log(device.name + ' done!');

                        // Callback after all devices are tested
                        if(counter == devices.length) createZip(res);
                    })
                    .catch(function(error) {
                        console.error('Search failed:', error);
                    });
                }) 
                .catch(function(error){
                    console.error('Error at "getDimensions()":', error);
                });
            })
            .catch(function(error){
                console.error('Error at "hideScrollBar()":', error);
            });
    });
    
    // Compress our screenshots into a zip file
    function createZip(res){
        console.log('\nAttempting to create zip file: ' + saveDir + 'screenshots.zip');
        zip.zip(saveDir, saveDir + '.zip').then(function() {
            console.log('\nZip file created...');
            rename(res);
        }).catch(function(err) {
            console.error(err);    
        });
    }

    // createZip() fails when you provide a filename for the zip file
    // so save it as just '.zip' and then rename here
    function rename(res){
        fs.rename(saveDir + '.zip', saveDir + 'screenshots.zip', function (err) {
            if (err){
                console.log('Error renaming blank zip folder:');
                console.log(err);
                throw err;
            } 
            console.log('Saved as ' + saveDir + 'screenshots.zip');
            // Send the response (zip file) back
            res.download(saveDir + 'screenshots.zip');
            setTimeout(function(){ removeFolder(); }, 30 * 1000);
        });
    }
    
    // Remove the entire folder once we're finished
    function removeFolder(){
        rmdir(saveDir, function (err, dirs, files) {
          console.log(dirs);
          console.log(files);
          console.log('All files are removed!');
        });
    }
}




