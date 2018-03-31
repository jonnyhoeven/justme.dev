new Vue({
    el: '#vue-portfolio',
    data: {
        detailItems: [],
        items: [
            {
                id: 0,
                selected: true,
                name: 'Mobile AR',
                longName: 'Augmented Reality Mobile Game based on Vuforia and Unity.',
                url: 'https://github.com/jonnyhoeven/Unity-Augmented-Game',
                image: '/images/vuforia.jpg',
                type: 'Java / C#',
                readme: `Unity demo game for android devices.
                This is a simple demonstration of gaming elements using augmented reality features found in Vuforia imaging SDK and
                And Unity a simple 3D engine. Objective of the game is collecting the dropped logo's by tapping the screen while the avatar path finds your clicked area with raytracing.
                Print out included Marker0.png start app and point the camera to the target (Do not dither the image).
                Unsigned android apk included.`
            },
            {
                id: 1,
                selected: false,
                name: 'OpenData',
                longName: 'Twitter OpenData GeoJSON parser',
                url: 'https://github.com/jonnyhoeven/schnitzel',
                image: '/images/schnitzel.jpg',
                type: 'JavaScript',
                readme: `A compact geojson opendata parser/viewer with map overlay uses OpenData released by twitter.`
            },
            {
                id: 2,
                selected: false,
                name: 'Integration',
                longName: 'Stage DMX and Camera integrated interface for concert de Doelenn hall.',
                url: 'https://github.com/jonnyhoeven/CVTI',
                image: '/images/cvti.jpg',
                type: 'VB.net',
                readme: `Touch Interface developed for Concert Hall de Doelen.
                Main purpose is a interface for multiple wall mouted touch display devices with inputs for multiple cameras,
                mechanical hatches and lighting programs.
                Allows incorperation of <a href="https://github.com/jonnyhoeven/DMXControl">OpenDMX</a> for local Node Control.`
            },
            {
                id: 3,
                selected: false,
                name: 'OpenDMX',
                longName: 'OpenDMX node connected .NET Usercontrols',
                url: 'https://github.com/jonnyhoeven/DMXControl',
                image: '/images/opendmx.jpg',
                type: 'VB.Net',
                readme: `A salvaged project aimed to develop userControls for OPEN DMX usb nodes in Visual Studio.Net.
                With form designer it's pretty easy to drag and drop customized layouts. I eventually decided for a different hardware
                device platform featuring better specs. Networking and DMX mixing has not been implemented.`
            },
            {
                id: 4,
                selected: false,
                name: 'PHP',
                longName: 'Legacy PHP development for leading dutch travel agency',
                url: 'https://cruisereizen.nl',
                image: '/images/cruisereizen.jpg',
                type: 'PHP',
                readme: `Optimized development deployment process,
                PDO wrapper class for detecting and logging unprepared statements.
                Automated database cleanup and optimizations, performance logging and per page analytics to compare database versions and codechanges.
                API integrations feed parsing database entries and daily development operations.`
            }
        ]
    },
    methods: {
        highlight: function (item) {
            this.items.forEach(function (el) {
                el.selected = false;
            })
            item.selected = !item.selected;
        }
    }
});