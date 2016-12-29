var game = {
    players: [{
        name: "human",
        cssClass: "fa fa-stack-1x fa-plane text-info animated",
        cssAnim: "bounceIn",
        cssAnimWin: "tada",
        useAI: false
    }, {
        name: "computer",
        cssClass: "fa fa-stack-1x fa-car text-danger animated",
        cssAnim: "rubberBand",
        cssAnimWin: "swing",
        useAI: true
    }],
    currentPlayerId: 0,
    get nextPlayerId() {
        if (this.currentPlayerId === (this.players.length - 1)) {
            return 0;
        } else {
            return this.currentPlayerId + 1;
        }
    },
    get prevPlayerId() {
        if (this.currentPlayerId === 0) {
            return (this.players.length - 1);
        } else {
            return this.currentPlayerId - 1;
        }
    },
    get prevPlayer() {
        return this.players[this.prevPlayerId];
    },
    get currentPlayer() {
        return this.players[this.currentPlayerId];
    },
    moveCount: 0,
    winText: null,
    gameWon: false,
    size: 6,
    mGrid: null,
    get grid() {
        if (this.mGrid === null) {
            var arr = [];
            for (var i = 0; i < this.size; ++i) {
                var columns = [];
                for (var j = 0; j < this.size; ++j) {
                    columns[j] = -1;
                }
                arr[i] = columns;
            }
            this.mGrid = arr;
        }
        return this.mGrid;
    },
    set grid(val) {
        this.mGrid[val.locX][val.locY] = val.value;
    },
    divCanvas: "#divCanvas"
};


//dom doc ready
$(document).ready(function() {
    generateGrid(game);
});

// gets called by the onclick event in a generated cell inside divCanvas
function cellOnClick(x, y) {

    if (move(x, y, game) >= 0) {
        drawOnCanvas(x, y, game.prevPlayer.cssClass);
        if (game.currentPlayer.useAI) {
            //seekSolution(game, game.currentPlayer);
        }

    }

}

function drawOnCanvas(x, y, css) {
    getCellDom(x, y).toggleClass(css);
}

function move(x, y, g) {
    //check win state
//jstr(g.grid[x][y]);

    if ((g.grid[x][y] === -1) && (!g.gameWon)) {

        g.grid = {
            locX: x,
            locY: y,
            value: g.currentPlayerId
        };

        g.moveCount++;

        g.currentPlayerId = g.nextPlayerId;
        return checkWinState(x, y, g);

    }
    return -10;
}

function seekSolution(g, pId) {
    var sum = 0;
    var myG = $.extend(true, {}, g);

    for (var x = 0; x < g.size; x++) {

        for (var y = 0; y < g.size; y++) {

            var mv = move(x, y, myG);


            if (g.prevPlayerId = pId) {
                sum += mv;
            } else {
                sum -= mv;
            }


            if (sum >= 10) {

                return myG;

            } else if (sum >= 0) {

                return seekSolution(myG, pId);
            }
        }

    }

}

function checkWinState(x, y, g) {
    //check col

    for (var ic = 0; ic < g.size; ic++) {
        if (g.mGrid[x][ic] != g.prevPlayerId) break;
        if (ic == (g.size - 1)) {
            g.gameWon = true;
            g.winText = "win col " + x;
            $(".cellcol" + x).toggleClass(g.prevPlayer.cssAnim)
            $(".cellcol" + x).toggleClass(g.prevPlayer.cssAnimWin)
            return ic;
        }
    }

    //check row
    for (var ir = 0; ir < g.size; ir++) {
        if (g.mGrid[ir][y] != g.prevPlayerId) {
            break;
        }
        if (ir == (g.size - 1)) {
            g.gameWon = true;
            g.winText = "win row " + y;
            $(".cellrow" + y).toggleClass(g.prevPlayer.cssAnim)
            $(".cellrow" + y).toggleClass(g.prevPlayer.cssAnimWin)

            return ir;

        }
    }

    //check diag
    if (x == y) {
        //we're on a diagonal
        for (var id = 0; id < g.size; id++) {
            if (g.mGrid[id][id] != g.prevPlayerId) break;
            if (id == g.size - 1) {
                g.gameWon = true;
                g.winText = "win diag " + x;

                $(".diag").toggleClass(g.prevPlayer.cssAnim)
                $(".diag").toggleClass(g.prevPlayer.cssAnimWin)

                return id;
            }
        }
    }

    //check anti diag
    for (var iad = 0; iad < g.size; iad++) {
        if (g.mGrid[iad][(g.size - 1) - iad] != g.prevPlayerId) break;
        if (iad == g.size - 1) {
            g.gameWon = true;
            g.winText = "win antidiag " + x;
            $(".antidiag").toggleClass(g.prevPlayer.cssAnim)
            $(".antidiag").toggleClass(g.prevPlayer.cssAnimWin)

            return iad;
        }
    }

    //check draw
    if (g.moveCount == (g.size * g.size)) {
        g.gameWon = true;
        g.winText = "draw";
        return -5;
    }
    return 0;
}


function getCellId(x, y) {
    return "grid" + x + "x" + y;
}

function getCellDom(x, y) {
    return $("#" + getCellId(x, y));
}

// Generates the HTML objects inside targetcanvas and returns a initialize array containing the cell adres and object state 
function generateGrid(g) {
    for (var y = 0;
    (y < g.size); y++) {
        for (var x = 0, row = "";
        (x < g.size); x++) {
            row += generateCellContents(x, y, g.size);
        }
        $(g.divCanvas).append("<div style='white-space:nowrap;'>" + row + "</div>");
    }
}

function generateCellContents(x, y, s) {
    return "<span class='fa-stack fa-3x border' onclick='cellOnClick(" + x + "," + y + ")'><i class='fa fa-square-o fa-stack-2x'></i><i id='" + getCellId(x, y) + "' class='" + genCssClasses(x, y, s) + "'></i></span>";
}

function genCssClasses(x, y, s) {
    var t = "";

    if (x == y) {
        t += "diag ";
    }
    if (x == (s - 1) - y) {
        t += "antidiag ";
    }
    t += "cellrow" + y + " cellcol" + x;

    return t;
}


function jstr(val) {
    console.log(JSON.stringify(val));
}