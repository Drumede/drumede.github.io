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

//bopie.style.left = 100 + "px";
//bopie.style.top = 100 + "px";
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

let isMouseDown = false;

document.addEventListener('mousedown', () => {
    isMouseDown = true;
    console.log('Mouse button is down');
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    console.log('Mouse button is up');
});

document.addEventListener('mousemove', (event) => {
   mouseX = event.clientX; // X-coordinate relative to the viewport
   mouseY = event.clientY; // Y-coordinate relative to the viewport
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

    
    if (isMouseDown) {
        var rmx = mouseX - posX
        var rmy = mouseY - posY
        var md = Math.atan2(rmy,rmx)
        console.log(md)
        posX += Math.cos(md)*5
        posY += Math.sin(md)*5
    } else {
        posX += dirx*3
        posY += diry*3
    }

    // Set the new position
    bopie.style.left = posX + "px";
    bopie.style.top = posY + "px";
    trees.forEach((tree,index) => {
        if (checkOverlap(bopie,tree)) {
            tree.remove()
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
