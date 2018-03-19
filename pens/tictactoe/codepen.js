var thisGame = {
    players: [{
        name: "human",
        value: 1,
        cssClass: "fa fa-stack-1x fa-plane animated",
        cssAnim: "bounceIn",
        cssAnimWin: "tada",
        isAI: false,
        score: 0
    }, {
        name: "computer",
        value: -1,
        cssClass: "fa fa-stack-1x fa-car animated",
        cssAnim: "rubberBand",
        cssAnimWin: "swing",
        isAI: true,
        score: 0
    }],

    gameSize: 4, // size of square grid
    divCanvas: "divTicTacToe", //Dom object for drawing grids cells

    gridState: null, // holds the grid values 
    cellSums: null,
    moveCount: 0,
    gameWon: false,
    currentPlayerId: 0, // holds the current playerid

    // loops the next playerIdentifier
    get nextPlayerId() {
        if (this.currentPlayerId === (this.players.length - 1)) {
            return 0;
        } else {
            return this.currentPlayerId + 1;
        }
    },

    get currentPlayer() {
        return this.players[this.currentPlayerId];
    },

    // reinit the HTML objects inside targetcanvas and reset gamestate 
    get generateGrid() {
        this.gridState = []; // initialize grid array
        this.cellSums = [];

        this.moveCount = 0;
        this.gameWon = false; // reset winstate
        $("#" + this.divCanvas).empty(); // emtpy target Canvas

        // loop through available index grid positions until we reach maxMoves value based on gameSize
        for (var ind = 0, cellClassNames = "", cellCont = "", lastRowIndex = 0; ind <= this.maxMoves; ind++) {

            var tCellProps = this.cellPropsFromIndex(ind); // get grid location properties
            var cellClassNames = "cell" + ind; // prepare cell classname

            this.gridState[ind] = 0; // set initial gridstate

            for (var sumId = 0; sumId < tCellProps.cellSumIds.length; sumId++) {
                cellClassNames += " winAnimTarget" + tCellProps.cellSumIds[sumId];
            }

            // create our html object
            cellCont += "<span class='fa-stack fa-3x border' onclick='cellOnClick(" + ind + ")' style='cursor:pointer;'>";
            cellCont += "<i class='fa fa-square-o fa-stack-2x' ></i > <i id='" + this.divCanvas + "Cell" + ind + "' class='" + cellClassNames + "'></i>";
            cellCont += "</span >";
            //<b>" + ind + "</b>: <i>(" + tCellProps.locX + "," + tCellProps.locY  + ")</i> [" + tCellProps.cellSumIds + "]";

            if (tCellProps.lastInRow) { // if last in row 
                // append to canvas as new row 
                $("#" + this.divCanvas).append("<div style='white-space:nowrap;'>" + cellCont + "</div>");
                cellCont = "";
            } // end if

        } // end for
    }, //end generate grid function

    doMove(ind) {
        var tCellProps = this.cellPropsFromIndex(ind); // defines target cell for move

        if (tCellProps.invalidMove === false && tCellProps.cellEmpty === true) { // if cell is empty and move valid

            //insert player gridvalue into gridState
            this.gridState[tCellProps.index] = this.currentPlayer.value;

            //draw update
            $("#" + this.divCanvas + "Cell" + ind).toggleClass(this.currentPlayer.cssClass); // drawchange
            $("#" + this.divCanvas + "Cell" + ind).toggleClass(this.currentPlayer.cssAnim); // seperate update for animation

            //increment movecounter
            this.moveCount++;
            //check for game draw

            if (this.moveCount >= (this.maxMoves + 1)) {
                this.gameWon = true;
            }

            var attackWinIds = []; // defines winID
            var moves = []; // defines all ai moves

            for (var sIndex = 0; sIndex < tCellProps.cellSumIds.length; sIndex++) { // for each SumId

                //  add gridstate to sum at index
                if (this.cellSums[tCellProps.cellSumIds[sIndex]] === undefined) {
                    this.cellSums[tCellProps.cellSumIds[sIndex]] = this.gridState[tCellProps.index]; // if undefined create first value at index
                } else {
                    this.cellSums[tCellProps.cellSumIds[sIndex]] += this.gridState[tCellProps.index]; // add value at index
                }

                // if winning Sum or negative Sum
                if (this.cellSums[tCellProps.cellSumIds[sIndex]] >= this.gameSize ||
                    this.cellSums[tCellProps.cellSumIds[sIndex]] <= (0 - this.gameSize)) {
                    this.gameWon = true; // set win state
                    winAnimTarget = ".winAnimTarget" + tCellProps.cellSumIds[sIndex]; // set animation target
                    $(winAnimTarget).toggleClass(this.currentPlayer.cssAnim);
                    $(winAnimTarget).toggleClass(this.currentPlayer.cssAnimWin);
                    break; // break when we have the first winstate
                }

            } // end for


            if (this.gameWon === false) {
                this.currentPlayerId = this.nextPlayerId; // end turn, go to next player
            }

            if (this.currentPlayer.isAI === true && this.gameWon === false) {

                for (var gridIndex = 0; gridIndex <= this.maxMoves; gridIndex++) { // for each cell in grid
                    var targetLoc = this.cellPropsFromIndex(gridIndex); // get grid properties

                    if (targetLoc.cellEmpty === true && targetLoc.cellSumIds != undefined) { // if cell is available
                        for (var sumIndex = 0; sumIndex <= targetLoc.cellSumIds.length; sumIndex++) { // for each winstate sum
                            var myAtt = {}; // define attack
                            myAtt.loc = targetLoc; //add cell properties

                            if (this.cellSums[targetLoc.cellSumIds[sumIndex]] === undefined) {
                                // if unset, set to 0
                                myAtt.sum = 0;
                                myAtt.score = 0
                            } else {
                                // save value to cell
                                myAtt.sum = this.cellSums[targetLoc.cellSumIds[sumIndex]]; // save sum
                                myAtt.score = Math.abs(myAtt.sum) * targetLoc.cellSumIds.length // calculate score on amount of cellsumids
                            }

                            moves.push(myAtt); // save attack
                        }
                    }
                }
                // sort array by sum score
                var mySortArr = moves.sort(function (a, b) {
                    return (b.score - a.score);
                });

                jstr(mySortArr);
                // do top scoring move
                this.doMove(mySortArr[0].loc.index);
            }


        }

    },

    //returns cellprops from index
    cellPropsFromIndex(ind) {
        var tCellProps = {};

        if (ind >= 0 || ind <= this.maxMoves) {
            tCellProps.cellSumIds = [];
            tCellProps.lastInRow = false;
            tCellProps.index = ind;
            tCellProps.value = this.gridState[ind];

            if (ind < this.gameSize) {
                tCellProps.locX = ind;
                tCellProps.locY = 0;
            } else {
                var tmp = Math.floor(ind / this.gameSize);
                tCellProps.locX = (ind - (tmp * this.gameSize));
                tCellProps.locY = tmp;
            }

            // last in row
            tCellProps.lastInRow = (tCellProps.locX === (this.gameSize - 1));

            // cell empty
            if (tCellProps.value === 0) {
                tCellProps.cellEmpty = true;
            } else {
                tCellProps.cellEmpty = false;
            }

            //push cellSumId to cellSumIds array using gamesize multiplier to identify specific winstates
            tCellProps.cellSumIds.push(tCellProps.locX); // push x at index 0
            tCellProps.cellSumIds.push(tCellProps.locY + this.gameSize); // add at index with offset of 1 x gameSize

            // if normal diag
            if (tCellProps.locX === ((this.gameSize - 1) - tCellProps.locY)) {
                tCellProps.cellSumIds.push((this.gameSize * 2)) // add using 2 x gamesize + index 0
            }

            // if anti diag
            if (tCellProps.locX === tCellProps.locY) {
                tCellProps.cellSumIds.push((this.gameSize * 2) + 1) // add using 2 x hgamesize +index 1
            }

            tCellProps.invalidMove = false;

        } else {
            tCellProps.invalidMove = true;
        }

        return tCellProps;
    },

    //returns cellprops from coords
    cellPropsFromCoord(x, y) {
        var ind = -1;

        if (x >= 0 && x <= this.gameSize &&
            y >= 0 && y <= this.gameSize) {
            //find index based on coords 
            if (x === 0 && y === 0) {
                ind = 0
            } else {
                if (y === 0) {
                    ind = x;
                } else {
                    ind = (this.gameSize * y) + x;
                }
            }

            //return cell properties using index
            return this.cellPropsFromIndex(ind);
        } else {
            return {
                invalidMove: true
            };
        }

    },

    // returns max moves
    get maxMoves() {
        return ((this.gameSize * this.gameSize) - 1);
    }
};

// dom doc ready
$(document).ready(function () {
    thisGame.generateGrid;
});

// gets called by the onclick event in a generated cell inside divCanvas dom object
function cellOnClick(ind) {
    if (thisGame.gameWon) { //check if myGame has been won already

        thisGame.generateGrid; //reset board
        if (thisGame.currentPlayer.isAI === true) {
            // if this is game is won by ai, generate grid and do move at center cell
            thisGame.doMove(thisGame.maxMoves / 2);
        }
    } else {
        thisGame.doMove(ind);
    }
}

function jstr(str) {
    //console.log(JSON.stringify(str));
}