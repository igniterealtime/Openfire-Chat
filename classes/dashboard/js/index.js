window.Tower = {
    ready: false,
    current: null,
    status: {},

    // Tower Control becomes ready only after the first status is received from the server
    isReady: function() {
        Tower.ready = true;

        // let everyone listening in know
        Dashboard.Utils.emit('tower-control|ready|true');

        return true;
    },


    init: function() {
        //set options for the Dashboard
        Dashboard.setOptions({
            'appName': 'sample-dashboard'
        });

        //initialize the Dashboard, set up widget container
        Dashboard.init();

        // console section
        Dashboard.preregisterWidgets({'iframe_overview': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_verto': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_users': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_registrations': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_calls': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_conferences': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_gateways': widgetIframe});

        // call center section
        Dashboard.preregisterWidgets({'iframe_agents': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_queues': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_tiers': widgetIframe});
        Dashboard.preregisterWidgets({'iframe_agent_calls': widgetIframe});

        // blast section
        Dashboard.preregisterWidgets({'iframe_message_blast': widgetIframe});

        //open first section - console
        Tower.section['console']();
    },

    //define the sections
    section: {
        'console': function() {
            // the array of widgets that belong to the section,
            // these were preregistered in init() because they are unique
            var widgets = [
                { widgetId: 'iframe_overview', data: {url: "fs/overview.jsp", width: "100%", height: "512px", title: "Overview"} },
                { widgetId: 'iframe_verto', data: {url: "verto/", width: "100%", height: "512px", title: "Verto Communicator"} },
                { widgetId: 'iframe_users', data: {url: "fs/users.jsp", width: "100%", height: "512px", title: "Users"} },
                { widgetId: 'iframe_registrations', data: {url: "fs/registrations.jsp", width: "100%", height: "512px", title: "Registrations"} },
                { widgetId: 'iframe_calls', data: {url: "fs/calls.jsp", width: "100%", height: "512px", title: "Active Calls"} },
                { widgetId: 'iframe_conferences', data: {url: "fs/conferences.jsp", width: "100%", height: "512px", title: "Active Conferences"} },
                { widgetId: 'iframe_gateways', data: {url: "fs/gateways.jsp", width: "100%", height: "512px", title: "Gateways"} },
            ];

            // opens the section and pass in the widgets that it needs
            Dashboard.showSection('console', widgets);
        },

        'call_center': function() {
            var widgets = [
                { widgetId: 'iframe_agents', data: {url: "fs/agents.jsp", width: "100%", height: "512px", title: "Agents"}  },
                { widgetId: 'iframe_queues', data: {url: "fs/queues.jsp", width: "100%", height: "512px", title: "Queues"}  },
                { widgetId: 'iframe_tiers', data: {url: "fs/tiers.jsp", width: "100%", height: "512px", title: "Agent/Queue Mapping"}  },
                { widgetId: 'iframe_agent_calls', data: {url: "fs/agent-calls.jsp", width: "100%", height: "512px", title: "Agent Calls"}  }
            ];
            Dashboard.showSection('call_center', widgets);
        },
        'blast': function() {
            var widgets = [
                { widgetId: 'iframe_message_blast', data: {url: "blast/index.jsp", width: "100%", height: "512px", title: "Message Blast"}  }
            ];
            Dashboard.showSection('blast', widgets);
        }
    }
};



$(function() {
    $(window).on('scroll', function(e) {
        if ($(window).scrollTop() > 50) {
            $('body').addClass('sticky');
        } else {
            $('body').removeClass('sticky');
        }
    });

    // Resetting dashboard
    $('#reset').on('click', function() {
        Dashboard.reset();
    })

    // Navigation menu handler
    $('.tower-sidebar li').click(function(e) {
        var id = $(this).attr('id');

        e.preventDefault();

        Tower.current = id;

        $('.tower-sidebar li').removeClass('active');
        $(this).addClass('active');

        Tower.section[Tower.current]();

        $('.tower-page-title').html( $('<span>', { html: $(this).find('.tower-sidebar-item').html() }) );
    });

    // ---------- INIT -----------
    Tower.init();

    // Setting 'Console' as first section
    $('.tower-sidebar li').first().click();
});
