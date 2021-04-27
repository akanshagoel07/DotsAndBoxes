// game parameters
const DELAY_AI = 0.5; // seconds for the computer to take its turn
const DELAY_END = 2; // seconds until a new game starts
const GRID_SIZE = 3; // number of rows (and columns)
const HEIGHT = 550; // pixels
const WIDTH = 550;
const CELL = 100; // size of cells (as well as left and right margin)
const STROKE = 17; // stroke width
const DOT = 17; // dot radius
const MARGIN = 150; // top margin for score, names, etc.

// colours
const COLOR_BOARD = "silver";
const COLOR_BORDER = "grey";
const COLOR_AI = "blue";
const COLOR_HU = "red";
const COLOR_TIE = "black";

// text
const TEXT_AI = "AI";
const TEXT_HU = "Human";
const TEXT_SIZE = 26;
const TEXT_TIE = "IT'S A DRAW!";
const TEXT_WIN = "WINS!";

// definitions
const Side = {
    BOTTOM: 0,
    LEFT: 1,
    RIGHT: 2,
    TOP: 3
}

// set up the game canvas
var canv = document.createElement("canvas");
canv.height = HEIGHT;
canv.width = WIDTH;
document.body.appendChild(canv);
var canvRect = canv.getBoundingClientRect();

// set up the context
var ctx = canv.getContext("2d");
ctx.lineWidth = 10;
ctx.textAlign = "center";

// game variables
var currentCells, playersTurn, squares;
var scoreAi, scoreHu;
var timeAi, timeEnd;

// start a new game
newGame();

// event handlers
canv.addEventListener("mousemove", highlightGrid);
canv.addEventListener("click", click);

// set up the game loop
setInterval(loop, 1000 / 30);

function loop() {
    drawBoard();
    drawSquares();
    drawGrid();
    drawScores();
    minimax();
}

function click(/** @type {MouseEvent} */ ev) {
    if (!playersTurn || timeEnd > 0) {
        return;
    }
    selectSide();
}

function drawBoard() {
    ctx.fillStyle = COLOR_BOARD;
    ctx.strokeStyle = COLOR_BORDER;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeRect(STROKE / 2, STROKE / 2, WIDTH - STROKE, HEIGHT - STROKE);
}

function drawDot(x, y) {
    ctx.fillStyle = "grey";
    ctx.beginPath();
    ctx.arc(x, y, DOT, 0, Math.PI * 30);
    ctx.fill();
}

function drawGrid() {
    for (let i = 0; i < GRID_SIZE + 1; i++) {
        for (let j = 0; j < GRID_SIZE + 1; j++) {
            drawDot(getGridX(j), getGridY(i));
        }
    }
}

function drawLine(x0, y0, x1, y1, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

function drawScores() {
    let colorAi = COLOR_AI;
    let colorHu = COLOR_HU;
    drawText(TEXT_HU, WIDTH * 0.25, MARGIN * 0.25, colorHu, TEXT_SIZE);
    drawText(scoreHu, WIDTH * 0.25, MARGIN * 0.6, colorHu, TEXT_SIZE * 2);
    drawText(TEXT_AI, WIDTH * 0.75, MARGIN * 0.25, colorAi, TEXT_SIZE);
    drawText(scoreAi, WIDTH * 0.75, MARGIN * 0.6, colorAi, TEXT_SIZE * 2);

    // game over text
    if (timeEnd > 0) {
        timeEnd--;

        // handle a tie
        if (scoreAi == scoreHu) {
            drawText(TEXT_TIE, WIDTH * 0.5, MARGIN * 0.6, COLOR_TIE, TEXT_SIZE);
        } else {
            let playerWins = scoreHu > scoreAi;
            let color = playerWins ? COLOR_HU : COLOR_AI;
            let text = playerWins ? TEXT_HU : TEXT_AI;
            drawText(text, WIDTH * 0.5, MARGIN * 0.5, color, TEXT_SIZE);
            drawText(TEXT_WIN, WIDTH * 0.5, MARGIN * 0.7, color, TEXT_SIZE);
        }

    }
}

function drawSquares() {
    for (let row of squares) {
        for (let square of row) {
            square.drawSides();
            square.drawFill();
        }
    }
}

function drawText(text, x, y, color, size) {
    ctx.fillStyle = color;
    ctx.font = size + "px dejavu sans mono";
    ctx.fillText(text, x, y);
}

function getColor(player) {
    if (player) {
        return COLOR_HU;
    } else {
        return COLOR_AI;
    }
}

function getText(player) {
    if (player) {
        return TEXT_HU;
    } else {
        return TEXT_AI;
    }
}

function getGridX(col) {
    return CELL * (col + 1);
}

function getGridY(row) {
    return MARGIN + CELL * row;
}

function getValidNeighbourSides(row, col) {
    let sides = [];
    let square = squares[row][col];

    // check left
    if (!square.sideLeft.selected) {
        if (col == 0 || squares[row][col - 1].numSelected < 2) {
            sides.push(Side.LEFT);
        }
    }

    // check right
    if (!square.sideRight.selected) {
        if (col == squares[0].length - 1 || squares[row][col + 1].numSelected < 2) {
            sides.push(Side.RIGHT);
        }
    }

    // check top
    if (!square.sideTop.selected) {
        if (row == 0 || squares[row - 1][col].numSelected < 2) {
            sides.push(Side.TOP);
        }
    }

    // check bottom
    if (!square.sideBot.selected) {
        if (row == squares.length - 1 || squares[row + 1][col].numSelected < 2) {
            sides.push(Side.BOTTOM);
        }
    }

    return sides;
}

function minimax() {

    if (playersTurn || timeEnd > 0) {
        return;
    }

    // count down till computer makes a selection
    if (timeAi > 0) {
        timeAi--;
        if (timeAi == 0) {
            selectSide();
        }
        return;
    }

    // set up the options array
    let options = [];
    options[0] = [];
    options[1] = [];
    options[2] = [];

    // first priority - select a square that has 3 sides completed
    // next priority - select a square that has 0 or 1 sides completed
    // final priority - select a square that has 2 sides completed
    for (let i = 0; i < squares.length; i++) {
        for (let j = 0; j < squares[0].length; j++) {
            switch (squares[i][j].numSelected) {
                case 3: // first priority
                    options[0].push({square: squares[i][j], sides: []});
                    break;
                case 0: // second priority
                case 1:
                    let sides = getValidNeighbourSides(i, j);
                    let priority = sides.length > 0 ? 1 : 2;
                    options[priority].push({square: squares[i][j], sides: sides});
                    break;
                case 2: // third priority
                    options[2].push({square: squares[i][j], sides: []});
                    break;
            }
        }
    }

    // randomly choose a square in priority order
    let option;
    if (options[0].length > 0) {
        option = options[0][Math.floor(Math.random() * options[0].length)];
    } else if (options[1].length > 0) {
        option = options[1][Math.floor(Math.random() * options[1].length)];
    } else if (options[2].length > 0) {
        option = options[2][Math.floor(Math.random() * options[2].length)];
    }

    // randomly choose a valid side
    let side = null;
    if (option.sides.length > 0) {
        side = option.sides[Math.floor(Math.random() * option.sides.length)];
    }

    // get the square's coordinates
    let coords = option.square.getFreeSideCoords(side);
    highlightSide(coords.x, coords.y);

    // set up delay
    timeAi = Math.ceil(DELAY_AI * 30);
}

function highlightGrid(/** @type {MouseEvent} */ ev) {
    if (!playersTurn || timeEnd > 0) {
        return;
    }

    // get mouse position relative to the canvas
    let x = ev.clientX - canvRect.left;
    let y = ev.clientY - canvRect.top;

    // highlight the square's side
    highlightSide(x, y);
}



function selectSide() {
    if (currentCells == null || currentCells.length == 0) {
        return;
    }

    // select the side(s)
    let filledSquare = false;
    for (let cell of currentCells) {
        if (squares[cell.row][cell.col].selectSide()) {
            filledSquare = true;
        }
    }
    currentCells = [];

    // check for winner
    if (filledSquare) {
        if (scoreHu + scoreAi == GRID_SIZE * GRID_SIZE) {
            // game over
            timeEnd = Math.ceil(DELAY_END * 30);
        }
    } else {
        // next player's turn
        playersTurn = !playersTurn;
    }
}

// create the Square object constructor
function Square(x, y, w, h) {
    this.w = w;
    this.h = h;
    this.bot = y + h;
    this.top = y;
    this.left = x;
    this.right = x + w;
    this.highlight = null;
    this.numSelected = 0;
    this.owner = null;
    this.sideBot = {owner: null, selected: false};
    this.sideTop = {owner: null, selected: false};
    this.sideLeft = {owner: null, selected: false};
    this.sideRight = {owner: null, selected: false};

    this.contains = function(x, y) {
        return x >= this.left && x < this.right && y >= this.top && y < this.bot;
    }

    this.drawFill = function() {
        if (this.owner == null) {
            return;
        }

        // light background
        ctx.fillStyle = getColor(this.owner, true);
        ctx.fillRect(
            this.left + STROKE, this.top + STROKE,
            this.w - STROKE * 2, this.h - STROKE * 2
        );

        
    }

    this.drawSide = function(side, color) {
        switch(side) {
            case Side.BOTTOM:
                drawLine(this.left, this.bot, this.right, this.bot, color);
                break;
            case Side.TOP:
                drawLine(this.left, this.top, this.right, this.top, color);
                break;
            case Side.LEFT:
                drawLine(this.left, this.top, this.left, this.bot, color);
                break;
            case Side.RIGHT:
                drawLine(this.right, this.top, this.right, this.bot, color);
                break;
            
        }
    }

    this.drawSides = function() {

        // highlighting
        if (this.highlight != null) {
            this.drawSide(this.highlight, getColor(playersTurn, true));
        }

        // selected sides
        if (this.sideBot.selected) {
            this.drawSide(Side.BOTTOM, getColor(this.sideBot.owner, false));
        }
        if (this.sideTop.selected) {
            this.drawSide(Side.TOP, getColor(this.sideTop.owner, false));
        }
        if (this.sideLeft.selected) {
            this.drawSide(Side.LEFT, getColor(this.sideLeft.owner, false));
        }
        if (this.sideRight.selected) {
            this.drawSide(Side.RIGHT, getColor(this.sideRight.owner, false));
        }
        
    }
    
    // return a random free side's coordinates
    this.getFreeSideCoords = function(side) {
        
        // valid coordinates of each side
        let coordsBottom = {x: this.left + this.w / 2, y: this.bot - 1};
        let coordsTop = {x: this.left + this.w / 2, y: this.top};
        let coordsLeft = {x: this.left, y: this.top + this.h / 2};
        let coordsRight = {x: this.right - 1, y: this.top + this.h / 2};
        

        // get coordinates of given side
        let coords = null;
        switch (side) {
            case Side.BOTTOM:
                coords = coordsBottom;
                break;
            case Side.TOP:
                coords = coordsTop;
                break;
            case Side.LEFT:
                coords = coordsLeft;
                break;
            case Side.RIGHT:
                coords = coordsRight;
                break;
            
        }

        // return requested side's coordinates
        if (coords != null) {
            return coords;
        }

        // otherwise choose a random free side
        let freeCoords = [];
        if (!this.sideBot.selected) {
            freeCoords.push(coordsBottom);
        }
        if (!this.sideTop.selected) {
            freeCoords.push(coordsTop);
        }
        if (!this.sideLeft.selected) {
            freeCoords.push(coordsLeft);
        }
        if (!this.sideRight.selected) {
            freeCoords.push(coordsRight);
        }
        
        return freeCoords[Math.floor(Math.random() * freeCoords.length)];
    }

    this.highlightSide = function(x, y) {

        // calculate the distances to each side
        let disBottom = this.bot - y;
        let disTop = y - this.top;
        let disLeft = x - this.left;
        let disRight = this.right - x;

        // determine closest value
        let disClosest = Math.min(disBottom, disTop, disLeft, disRight);

        // highlight the closest if not already selected
        if (disClosest == disBottom && !this.sideBot.selected) {
            this.highlight = Side.BOTTOM;
        }else if (disClosest == disTop && !this.sideTop.selected) {
            this.highlight = Side.TOP;
        } else if (disClosest == disLeft && !this.sideLeft.selected) {
            this.highlight = Side.LEFT;
        } else if (disClosest == disRight && !this.sideRight.selected) {
            this.highlight = Side.RIGHT;
        } 

        // return the highlighted side
        return this.highlight;
    }

    this.selectSide = function() {
        if (this.highlight == null) {
            return;
        }

        // select the highlighted side
        switch (this.highlight) {
            case Side.BOTTOM:
                this.sideBot.owner = playersTurn;
                this.sideBot.selected = true;
                break;
            case Side.TOP:
                this.sideTop.owner = playersTurn;
                this.sideTop.selected = true;
                break;
            case Side.LEFT:
                this.sideLeft.owner = playersTurn;
                this.sideLeft.selected = true;
                break;
            case Side.RIGHT:
                this.sideRight.owner = playersTurn;
                this.sideRight.selected = true;
                break;
            
        }
        this.highlight = null;

        // increase the number of selected
        this.numSelected++;
        if (this.numSelected == 4) {
            this.owner = playersTurn;

            // increment score
            if (playersTurn) {
                scoreHu++;
            } else {
                scoreAi++;
            }

            // filled
            return true;
        }

        // not filled
        return false;
    }
}