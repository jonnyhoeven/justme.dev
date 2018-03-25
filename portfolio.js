new Vue({
    el: '#vue-portfolio',
    data: {
        title: 'Git',
        selectedItem: {},
        showdetail: false,
        items: [
            {
                id: 0,
                name: 'Augmented Reality',
                url: 'https://github.com/jonnyhoeven/Unity-Augmented-Game',
                image: '/images/vuforia.jpg',
                type: 'Java / C#',
                readme: `Unity demo game for android devices
                        This is a simple demonstration of gaming elements with augmented reality using Unity and Vuforia imaging sdk.
                        Objective of this game is to collect the dropped items by tapping the screen.
                        Print out included Marker0.png start app and point the camera to the target.
                        Unsigned android apk included.`
            },
            {
                id: 1,
                name: 'GeoJSON openData',
                url: 'https://github.com/jonnyhoeven/schnitzel',
                image: '/images/schnitzel.jpg',
                type: 'JavaScript',
                readme: `A compact geojson opendata parser filtering twitter users with specific travel behaviour between geographical areas.
                during a Hackathon in 2016.
                By team Schnitzel consisting of:
                Tyas v.d. Spree
                Erik Kamp
                Gijs
                Jonny van der Hoeven
                Features
                Flexible parser in java uses opendata from twitter.
                Entirely client-side, can be hosted for free on GitHub Pages`
            },
            {
                id: 2,
                name: 'Stage Lighting',
                url: 'https://github.com/jonnyhoeven/CVTI',
                image: '/images/cvti.jpg',
                type: 'VB.net',
                readme: `Allows incorperation of https://github.com/jonnyhoeven/DMXControl, Does not include networking code for client -> OpenDMX Node Server setup (it was dropped early on in favour of commercial solutions).
                IP Camera control and viewer Auto update for all clients from a central location`
            },
            {
                id: 3,
                name: 'OpenDMX',
                url: 'https://github.com/jonnyhoeven/DMXControl',
                image: '/images/opendmx.jpg',
                type: 'VB.Net',
                readme: `This was a test project to develop interfaces for OPEN DMX usb nodes. I eventually decided for a different hardware device featuring some internal dmx buffer memory.`
            }
        ]
    },
    methods: {
        test: function (item) {
            if (this.selectedItem.id === item.id && this.showdetail) {
                this.showdetail = false;
            } else {
                this.showdetail = true;
                this.selectedItem = item;
            }
        }
    }
});