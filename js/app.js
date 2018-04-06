
new Vue({
    el: '#vue-app',
    data: {
        contactMessage: 'For more information feel free to contact me:',
        contactEmailText: 'jonnyhoeven@gmail.com',
        contactEmail: 'mailto:jonnyhoeven@gmail.com',
        welcomeMessage: 'Hi, nice you could Make it!',
        
        menuItems: [{
                id: 0,
                name: 'LinkedIn',
                url: 'https://nl.linkedin.com/in/jonnyhoeven',
                icon: 'fa-linkedin'
            },
            {
                id: 1,
                name: 'GitHub',
                url: 'https://www.github.com/jonnyhoeven',
                icon: 'fa-github'
            },
            {
                id: 2,
                name: 'CodePen',
                url: 'https://codepen.io/jonnyhoeven',
                icon: 'fa-codepen'
            },
            {
                id: 3,
                name: 'Thingiverse',
                url: 'https://www.thingiverse.com/jonnyhoeven/designs',
                icon: 'fa-print'
            },
            {
                id: 4,
                name: 'Instagram',
                url: 'https://www.instagram.com/jonnyhoeven',
                icon: 'fa-instagram'
            },
            {
                id: 5,
                name: 'YouTube',
                url: 'https://www.youtube.com/jonnyhoeven',
                icon: 'fa-youtube'
            }],
        portfolioItems: [
            {
                id: 0,
                selected: true,
                name: 'Mobile AR',
                longName: 'Augmented Reality Mobile Game based on Vuforia and Unity.',
                url: 'https://github.com/jonnyhoeven/Unity-Augmented-Game',
                image: '/images/vuforia.jpg',
                type: 'Java / C#',
                readme: `Unity demo game for android devices.
                This is a simple demonstration of gaming elements using augmented reality features found in the Vuforia imaging SDK used in combination with the Unity game engine.
                Objective of the game is to collect the dropped logo's by tapping the screen while the character pathfind it's way to you destination.
                Print out included Marker0.png start app and point the camera to the target.
                Unsigned android apk included.`
            },
            {
                id: 1,
                selected: false,
                name: 'Open Data',
                longName: 'Twitter OpenData GeoJSON parser',
                url: 'https://github.com/jonnyhoeven/schnitzel',
                image: '/images/schnitzel.jpg',
                type: 'JavaScript',
                readme: `A compact geojson opendata parser/viewer with map overlay includes example Twitter OpenData dataset offers sorting finding and highlight specific users with map overlay based on GeoJson Format.`
            },
            {
                id: 2,
                selected: false,
                name: 'Integration',
                longName: 'DMX and Camera frontend interface for concert hall de Doelen.',
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
                name: 'Open DMX',
                longName: 'OpenDMX node connected .NET Usercontrols',
                url: 'https://github.com/jonnyhoeven/DMXControl',
                image: '/images/opendmx.jpg',
                type: 'VB.Net',
                readme: `A salvaged project aimed to develop userControls for OPEN DMX usb nodes in Visual Studio.Net.
                With form designer it's pretty easy to drag and drop customized layouts. I eventually decided for a different hardware
                device platform featuring better specs. Networking and DMX mixing has not been implemented.`
            }
        ]
    },
    methods: {
        highlight: function (item) {
            this.portfolioItems.forEach(function (el) {
                el.selected = false;
            })
            item.selected = !item.selected;
        }
    }
});

var options = {
    strings: [
        'Hi!',
        'Nice you made it!',
        'Fancy web platforms up above,',
        'GitHub stuff down below.',
        'And a obligatory.',
        'Just Make it!'
    ],
    typeSpeed: 40,
    smartBackspace: true,
    backSpeed: 20,
    backDelay: 500,
  }
  
