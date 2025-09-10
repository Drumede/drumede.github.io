var parent = document.getElementById('parent'); // Element that holds the reddelf
var reddelf = document.getElementById('reddelf'); // The reddelf, can be anything
var dirx = Math.random()+1; // The direction we are moving... 1 is right, -1 is left.
var diry = Math.random()+1; // The direction we are moving... 1 is right, -1 is left.
var dist = 2; // The distance we move each "tick"
console.log(dirx)
console.log(diry)

reddelf.onclick = function() {
    var rand_top = Math.random()
    var rand_left = Math.random()
    reddelf.style.left = `${rand_left*parent.offsetWidth}px`
    reddelf.style.top = `${rand_top*parent.offsetHeight}px`
    
}

// The ID will let us stop it later if we want.
var intervalId = setInterval(function() {
    // Get the left, remove the "px" from the end and convert it to an integer.
    var posX = parseInt(reddelf.style.left.replace(/px$/, '')) || 0;
    var posY = parseInt(reddelf.style.top.replace(/px$/, '')) || 0;

    // Add dirx * dist
    posX += dirx * dist;

    // If we are moving right and we've gone over the right edge...
    if (posX + reddelf.offsetWidth > parent.offsetWidth) {

        // only move right to the edge...
        posX -= posX + reddelf.offsetWidth - parent.offsetWidth;
        // and change direction.
        dirx *= -1
    // If we are moving left and we've gone over the left edge...
    } else if (posX < 0) {

        // stop at zero...
        posX = 0;
        // and change direction...
        dirx *= -1;
    }

    // Add dirx * dist
    posY += diry * dist;


    if (posY + reddelf.offsetHeight > parent.offsetHeight) {

        // only move right to the edge...
        posY -= posY + reddelf.offsetHeight - parent.offsetHeight;
        // and change direction.
        diry *= -1
    // If we are moving left and we've gone over the left edge...
    } else if (posY < 0) {
        // stop at zero...
        posY = 0;
        // and change direction...
        diry *= -1;
    }

    // Set the new position
    reddelf.style.left = posX + "px";
    reddelf.style.top = posY + "px";

}, 10); // this number is how many milliseconds in between each move.
// Smaller interval time means smoother movement but slower performance.
