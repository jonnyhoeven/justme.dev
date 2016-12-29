
function SimonGame(gridContainerID,scoreContainerID) {
    "use strict";
    this.size = 64;
    this.columns = 8;
    this.maxSequenceLenght = 20;
    this.animationTypes = {
        wrong: 0, correct: 1, highlight: 2,
        animations: ["shake", "tada", "jello"]
    };
    this.iconSize = 1;
    this.presets = [
        {
            icon: "fa-plane",
            color: "text-info",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound80.wav"
        }, {
            icon: "fa-male",
            color: "text-success",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound81.wav"
        }, {
            icon: "fa-female",
            color: "text-info",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound82.wav"
        }, {
            icon: "fa-bell",
            color: "text-warning",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound83.wav"
        }, {
            icon: "fa-bug",
            color: "text-danger",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound84.wav"
        }, {
            icon: "fa-subway",
            color: "text-warning",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound85.wav"
        }, {
            icon: "fa-umbrella",
            color: "text-info",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound86.wav"
        }, {
            icon: "fa-wrench",
            color: "text-success",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound87.wav"
        }, {
            icon: "fa-area-chart",
            color: "text-success",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound88.wav"
        }, {
            icon: "fa-birthday-cake",
            color: "text-info",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound89.wav"
        }, {
            icon: "fa-database",
            color: "text-error",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound90.wav"
        }, {
            icon: "fa-rocket",
            color: "text-success",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound79.wav"
        }, {
            icon: "fa-trophy",
            color: "text-info",
            audio: "http://www.pacdv.com/sounds/interface_sound_effects/sound78.wav"
        }
    ]; // contains json data with preset icon/sound/color (bootstrap colors and font awesome icons)

    this.gridContainer = document.getElementById(gridContainerID);
    this.scoreContainer = document.getElementById(scoreContainerID);

    this.grid = Grid;
    this.sequence = Sequence;
    this.manager = Manager;

    var strictMode = true; // game strict mode setting (replay sequence or reset on wrong input

    function Sequence(size, maxSequenceLength) {
        var list = [];
        var index = 0;
        function randomIndex() {
            return Math.floor(Math.random() * size);
        }
        this.underMaxSequenceLength = function() {
            return (list.length < maxSequenceLength);
        };
        this.value = function () {
            console.log("index:(" + index + "/" + (list.length-1) + "): " + list[index] );
            return list[index];
        };
        this.next = function () {
            index++;
        };
        this.restart = function () {
            index = 0
        };
        this.itemsRemaining = function () {
            return (index < (list.length-1));
        };
        this.add = function () {
            console.log("adding random index" + list.length);
            list.push(randomIndex());
        };
        this.count = function() {
            return list.length;
        }
        this.reset = function() {
            list = [];
            this.add();
        };
        this.reset();
    }
    function Grid(container, presets, animationTypes, size, columns, iconSize) {
        this.items = [];
        this.myRow = newRow();  // creates new row with css class todo: move to presets
        this.fragment = document.createDocumentFragment();
        function Item(itemID, preset, container, animationTypes) {
            this.iconContainer = document.createElement("span");
            this.iconBorder = document.createElement("i");
            this.soundContainer = document.createElement("audio");
            this.icon = document.createElement("i");
            this.icon.classList.add("fa", preset.icon, "fa-stack-1x", "animated");
            this.icon.id =  itemID;
            this.iconContainer.classList.add("fa-stack", "fa-lg", "fa-"+ iconSize +"x", preset.color);
            this.iconBorder.classList.add("fa", "fa-square-o", "fa-stack-2x");
            this.soundContainer.type = "type=audio/mpeg";
            this.soundContainer.src = preset.audio;
            this.soundContainer.id = itemID;
            this.iconContainer.appendChild(this.iconBorder);
            this.iconContainer.appendChild(this.icon);
            this.iconContainer.appendChild(this.soundContainer);

            this.animate = function (animTypeIndex) {
                console.log("hello");
                for (var x = 0; x < animationTypes.animations.length; x++) {
                    this.icon.classList.remove(animationTypes.animations[x]); // remove animationtypes
                }
                void this.icon.offsetWidth; // redraw dom, needed for animation reset.

                this.icon.classList.add(animationTypes.animations[animTypeIndex]); // add animation class

                this.soundContainer.play();
            };

            container.appendChild(this.iconContainer);
        } // defines gridItem structure
        function newRow() {
            var div = document.createElement("div");
            div.classList.add("gridrow");
            return div;
        } // returns a new empty row with css-class identifier
        function randomPreset() {
            var presetIndex = Math.floor(Math.random() * presets.length);
            return presets[presetIndex];
        } // returns random preset data
        // create grid items
        for (var itemID = 0, colCount = 0; itemID < size; itemID++) {
            colCount++;
            this.items[itemID] = new Item(itemID, randomPreset(presets), this.myRow, animationTypes);
            if (colCount === columns) {
                this.fragment.appendChild(this.myRow);
                this.myRow = newRow();
                colCount = 0;
            }
        }
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        } // empty container
        container.appendChild(this.fragment); // append fragment to page
    }
    function Manager(sequence, grid, animationTypes, scoreContainer) {
        //this.scoreContainer = document.getElementById(scoreContainerID);
        var gameStates = {inactive: 0, preparePlay: 1, playSequence: 2, awaitInput: 3};
        var gameState = 0;
function updateScore() {
    scoreContainer.innerHTML = "Sequence: " + sequence.count();
}
        function playSequence() {
            sequence.restart();
            gameState = gameStates.preparePlay;
        }
        function correctValue(id) {
            if (sequence.itemsRemaining() && sequence.underMaxSequenceLength()) {

                sequence.next();
            } else {
                console.log("sequence input complete");
                sequence.add();
                playSequence();
            }
            grid.items[id].animate(animationTypes.correct);
        }
        function wrongValue(id) {

            if (strictMode) {
                sequence.reset();
            }
            playSequence();
            grid.items[id].animate(animationTypes.wrong);
        }
        function registerEventHandlers() {


            for (var x = 0;x < grid.items.length;x++) {
                grid.items[x].icon.addEventListener("click", function() {
                    if (gameState === gameStates.awaitInput) {
                        if (sequence.value() == this.id) {
                            correctValue(this.id);
                        } else {
                            wrongValue(this.id);
                        }
                    }
                    updateScore();
                }, false);
                grid.items[x].soundContainer.addEventListener("ended", function () {

                    if (gameState === gameStates.playSequence) {
                        if (sequence.itemsRemaining()) {
                            console.log("continue sequence")
                            sequence.next();
                            grid.items[sequence.value()].animate(animationTypes.highlight);
                        }else {
                            console.log("sequence complete await input");
                            gameState = gameStates.awaitInput;
                            sequence.restart();
                        }
                    }

                    if (gameState === gameStates.preparePlay) {
                        console.log("prepared for play");
                        gameState = gameStates.playSequence;
                        grid.items[sequence.value()].animate(animationTypes.highlight)
                    }
                    updateScore();
                }, false);
            }
        }
        this.startSequence = function () {
            playSequence();
            gameState = gameStates.playSequence;
            grid.items[sequence.value()].animate(animationTypes.highlight);
        };
        updateScore();
        registerEventHandlers();
    }

    this.toggleStrictMode = function () {
        strictMode = !strictMode;
        return strictMode;
    };
    this.start = function () {
        this.manager.startSequence();
    };
    this.reset = function () {
        this.sequence = new Sequence(this.size, this.maxSequenceLenght);
        this.grid = new Grid(this.gridContainer, this.presets, this.animationTypes, this.size, this.columns, this.iconSize);
        this.manager = new Manager(this.sequence, this.grid, this.animationTypes, this.scoreContainer);
    };
    this.reset();

}



