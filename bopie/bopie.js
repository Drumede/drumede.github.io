var bopie = document.getElementById("bopie")
var movingX = 0
var movingY = 0
var dirx = 0 
var diry = 0
var trees = []
const parser = new DOMParser();
var bopiestyle = window.getComputedStyle(bopie);
var mouseX = 0
var mouseY = 0
const music1 = document.getElementById('music1');
const music2 = document.getElementById('music2');
const bopieyaysfx = document.getElementById('bopieyay');
const treehit = document.getElementById('treehit');


//bopie.style.left = 100 + "px";
//bopie.style.top = 100 + "px";
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}



music1.addEventListener('ended', () => {
    if (getRandomInt(1,2) == 1 )
        music1.play()
    else 
        music2.play()
});

music2.addEventListener('ended', () => {
    if (getRandomInt(1,2) == 1 )
        music1.play()
    else 
        music2.play()
});

function checkOverlap(div1, div2) {
  const rect1 = div1.getBoundingClientRect();
  const rect2 = div2.getBoundingClientRect();

  // Check for non-overlap conditions
  return !(
    rect1.top > rect2.bottom ||
    rect1.right < rect2.left ||
    rect1.bottom < rect2.top ||
    rect1.left > rect2.right
  );
}

function getVectorLength(x, y) {
  return Math.sqrt(x * x + y * y);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bopieyay() {
    bopie.style.backgroundImage = "url(bopieyay.svg)"
    bopieyaysfx.play()
    setTimeout(function() {
        bopie.style.backgroundImage = "url(bopie.svg)"
    }, 400);
    setTimeout(bopieyay, getRandomInt(3000,5000));
}

function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

let isMouseDown = false;

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    bopie.style.backgroundImage = "url(bopie.svg)"
});

document.addEventListener('mousemove', (event) => {
   mouseX = event.clientX; // X-coordinate relative to the viewport
   mouseY = event.clientY; // Y-coordinate relative to the viewport
});

window.addEventListener('load', () => {
    setTimeout(function() {
        if (getRandomInt(1,2) == 1 )
            music1.play()
        else 
            music2.play()
    },1000)
    
    setTimeout(bopieyay, getRandomInt(3000,5000));
});

var bopieInterval = setInterval(function() {
    var posX = parseInt(bopie.style.left.replace(/px$/, '')) || 0;
    var posY = parseInt(bopie.style.top.replace(/px$/, '')) || 0;
    var width = parseInt(bopiestyle.width.replace(/px$/, '')) || 0;
    var height = parseInt(bopiestyle.height.replace(/px$/, '')) || 0;

    movingX -= 1
    movingY -= 1

    if (getRandomInt(1,5) == 5) {
        if (getRandomInt(1,2) == 2) {
            if (movingX <= 0) {
                movingX = getRandomInt(5,20)
                dirx = getRandomInt(0,1)*2-1
            } else 
                dirx = 0
        } else {
            if (movingY <= 0) {
                movingY = getRandomInt(5,20)
                diry = getRandomInt(0,1)*2-1
            } else
                diry = 0
        }
    }
    if (posX < 0) {
        movingX = getRandomInt(5,20)
        dirx *= -1
        posX = 0
    }
    if (posY < 0) {
        movingY = getRandomInt(5,20)
        diry *= -1
        posY = 0
    }
    if (posX > innerWidth-width) {
        movingX = getRandomInt(5,20)
        dirx *= -1
        posX = innerWidth-width
    }
    if (posY > window.innerHeight-height) {
        movingY = getRandomInt(5,20)
        diry *= -1
        posY = window.innerHeight-height
    }

    posX += dirx*3
    posY += diry*3
    
    if (isMouseDown) {
        var rmx = mouseX - posX + width/2
        var rmy = mouseY - posY + height/2
        var md = Math.atan2(rmy,rmx)
        posX += Math.cos(md)*5
        posY += Math.sin(md)*5
        bopie.style.transform = "rotate("+radiansToDegrees(md)+"deg)"
        bopie.style.backgroundImage = "url(bopiemouse.svg)"
    } else {
       
        bopie.style.transform = ""
    }

    // Set the new position
    bopie.style.left = posX + "px";
    bopie.style.top = posY + "px";
    trees.forEach((tree,index) => {
        if (checkOverlap(bopie,tree)) {
            tree.remove()
            treehit.play()
        }
    })
}, 10);

var treeInterval = setInterval(function() {
    const tree = document.createElement("div")
    tree.className = "tree"
    document.body.appendChild(tree)
    var treestyle = window.getComputedStyle(tree);
    var width = parseInt(treestyle.width.replace(/px$/, '')) || 0;
    var height = parseInt(treestyle.height.replace(/px$/, '')) || 0;
    tree.style.top = getRandomInt(0,window.innerHeight-height)+"px"
    tree.style.left = getRandomInt(0,window.innerWidth-width)+"px"
    trees.push(tree)
},1000);
