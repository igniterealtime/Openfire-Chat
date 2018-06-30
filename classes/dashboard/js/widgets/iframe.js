var widgetIframe = (function(id) {
    var extended = {
        title: 'Date',
        size: 'third',
        widgetId: id,

        hideLink: true,

        template: _.template('<div class="date-container"><iframe frameborder="0" style="border:0px; border-width:0px; margin-left: 0px; margin-top: 0px; margin-right: 0px; margin-bottom: 0px; width:<%=width%>;height:<%=height%>;" src="<%=url%>"></iframe></div>'),

        setData: function(data) {
            this.data = data;
            this.title = this.data.title;
        },

        fetch: function() {
            $('#widget-' + this.shell.id).css({
                'height': this.data.height,
                'margin-bottom': '10px',
                'overflow-x': 'hidden',
                'width': this.data.width
            }).html( this.template({
                url: this.data.url,
                width: this.data.width,
                height: this.data.height
            }) );
        },

        render: function() {
            Dashboard.render.widget(this.name, this.shell.tpl);
            this.fetch();
            this.postRender();

            $(document).trigger("WidgetInternalEvent", ["widget|rendered|" + this.name]);
        },
    };

    var widget = _.extend({}, widgetRoot, extended);

    // register presence with screen manager
    Dashboard.addWidget(widget);
});
