var bopie = document.getElementById("bopie")
var movingX = 0
var movingY = 0
var dirx = 0 
var diry = 0
var trees = []
//bopie.style.left = 100 + "px";
//bopie.style.top = 100 + "px";
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function areDivsOverlapping(div1, div2) {
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

var bopieInterval = setInterval(function() {
    var posX = parseInt(bopie.style.left.replace(/px$/, '')) || 0;
    var posY = parseInt(bopie.style.top.replace(/px$/, '')) || 0;

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
    }
    if (posY < 0) {
        movingY = getRandomInt(5,20)
        diry *= -1
    }
    posX += dirx*2
    posY += diry*2
    
    // Set the new position
    bopie.style.left = posX + "px";
    bopie.style.top = posY + "px";
    for (const tree in trees) {
        
    }
}, 10);

var treeInterval = setInterval(function() {
    let tree = document.createElement("div")
    tree.className = "tree"
    document.body.appendChild(tree)
    const computedStyle = window.getComputedStyle(tree);
    var width = parseInt(computedStyle.width.replace(/px$/, '')) || 0;
    var height = parseInt(computedStyle.height.replace(/px$/, '')) || 0;
    console.log(width+" "+height)
    tree.style.top = getRandomInt(0,window.innerHeight-height)+"px"
    tree.style.left = getRandomInt(0,window.innerWidth-width)+"px"
    trees.push(tree)
},1000);
