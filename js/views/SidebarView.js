(function () {

<!-- Templates -->

    var sidarbarRowHTML = '<div id="<%= id %>" class="sidebar-option"><div class="sidebar-image-div"></div><div class="sidebar-text"><%= text %></div></div>';

    var groupSeparatorHTML = '<div class="sidebar-separator"></div>';

    var searchInputHTML = '<img src="img/search.png" class="sidebar-search-image" alt=""><input type="text" class="sidebar-search-input" placeholder="Search">';

    var appRowHTML = '<% if (applicationIcon) { %> <img class="app-icon" src="<%= applicationIcon %>">' +
            '<% } else { %> <img class="app-icon" src="<%= defaultIconUrl %>"> <% } %>' +
                     '<div class="app-desc-div">' +
                        '<div class="app-name-text"><%= name %></div>'+
                        '<div class="app-config-name-text"><%= storeName %></div>'+
                        '<div class="app-description-text"><%= description %></div>'+
                     '</div>' +
                     '<div class="app-row-button-div">' +
                        '<div class="app-row-button"></div>' +
                     '</div>'
                     ;

    dm.SidebarRowModel = Backbone.Model.extend({
        defaults: {
            id: '',
            imageUrl: '',
            text: '',
            clickEventName: ''  // event name used in $.publish when clicked
        },
        initialize: function() {
            _(this).bindAll();
        }
    });

    dm.SidebarRowCollection = Backbone.Collection.extend({
        model: dm.SidebarRowModel,
        initialize: function(){
            var me = this;
        }
    });

    dm.SidebarRowView = Backbone.View.extend({
        template: _.template(sidarbarRowHTML),
        events: {
            'click' : 'rowClicked'
        },
        initialize: function(){
        },
        render: function(){
            this.$el.html(this.template(this.model.attributes));
            if (this.model.has("image")) {
                this.$el.find(".sidebar-image-div").html('<img src="' + this.model.get("image") + '" class="sidebar-image">');
            }
            return this;
        },
        rowClicked: function() {
            Backbone.Events.trigger('sidebar-view-click', this.model);
        }
    });

    dm.SideBarSearchRowView = Backbone.View.extend({
        className: 'sidebar-search-div',
        template: _.template(searchInputHTML),
        events: {
            'keyup' : 'onkeyup'
        },
        initialize: function(){
        },
        render: function(){
            this.$el.html(this.template());
            return this;
        },
        onkeyup: function() {
            Backbone.Events.trigger('sidebar-search', $(this.$el.find('.sidebar-search-input')[0]).val(), this.model);
        }
    });

    dm.SideBarButtonView = Backbone.View.extend({
        tagName: 'div',
        className: 'blue-button',
        events: {
            'click' : 'buttonClicked'
        },
        initialize: function(){
            this.model.on('change:text', this.render, this);
            this.model.on('change:addCSS', this.addCSS, this);
        },
        render: function(){
            this.$el.html(this.model.get('text'));
            return this;
        },
        addCSS: function() {
            this.$el.addClass(this.model.get('addCSS'));
            return this;
        },
        buttonClicked: function() {
            Backbone.Events.trigger('sidebar-view-click', this.model);
        }
    });

    // one row may have multiple buttons
    dm.SideBarButtonRowView = Backbone.View.extend({
        initialize: function(){
        },
        render: function(){
            this.$el.html('');
            this.collection.forEach(function(model) {
                var button = new dm.SideBarButtonView({model: model, id: model.get('id')});
                this.$el.append(button.render().$el);
            }, this);
            return this;
        }
    });


    dm.SidebarSectionView = Backbone.View.extend({
        initialize: function(){
        },

        render: function(){
            this.$el.html("");
            if (this.options.rowViews != undefined) {
                this.options.rowViews.forEach(function(view){
                    this.$el.append(view.render().$el);
                }, this);
            }
            else if (this.collection != undefined) {
                this.collection.forEach(function(model) {
                    var view = new dm.SidebarRowView({model: model});
                    this.$el.append(view.render().$el);
                }, this);
            }
            this.$el.append(groupSeparatorHTML);
            return this;
        }
    });

    dm.SidebarView = Backbone.View.extend({
        el: '#startupmenu-sidebar-container',
        initialize: function(){
        },
        render: function(){
            this.$el.html("");
            // sections should contain a list of SidebarSectionView
            this.options.sections.forEach(function(section){
                this.$el.append(section.render().$el);
            }, this);
            return this;
        }
    });

    dm.AppRowView = Backbone.View.extend({
        className: 'app-row-view',
        template: _.template(appRowHTML),
        events: {
            'click' : 'rowClicked'
        },
        initialize: function(){
        },
        render: function(){
            this.$el.html(this.template(this.model.attributes));
            return this;
        },
        rowClicked: function() {
            Backbone.Events.trigger('app-row-view-click', this.model);
        }
    });

    // one app matched the search
    dm.AppSearchRowView = Backbone.View.extend({
        className: 'app-row-view',
        template: _.template(appRowHTML),
        events: {
            'mouseenter' : 'hoverIn',
            'mouseleave' : 'hoverOut'
        },
        initialize: function(){
            this.model.on('change:isEnabled', this.render, this);
            this.$el.html(this.template(this.model.attributes));
        },
        render: function(){
            var button = this.$el.find('.app-row-button');
            if (this.model.get('isEnabled') == true) {
                console.log('app added ' + this.model.get('name'));
                button.html('Added').removeClass('app-add-button').addClass('app-added-button').unbind('click');
                console.log('app added display ' + button.css('display'));
            } else {
                button.html('Add').addClass('app-add-button').click($.proxy(function() {
                    button.html('Adding').unbind('click');
                    var newSettings = $.extend({}, this.model.attributes);
                    Backbone.Events.trigger('add-app-settings', newSettings);
                }, this));
            }
            return this;
        },
        hoverIn: function() {
            this.$el.find('.app-row-button').show();
        },
        hoverOut: function() {
            this.$el.find('.app-row-button').hide();
        }
    });

    // list of AppSearchRowView
    dm.AppSearchListView = Backbone.View.extend({
        initialize: function(){
            this.isattached = false;
            this.collection.on('reset', this.render, this);
            this.collection.on('change', this.appChanged, this);
        },
        render: function(){
            if (this.isattached == true) {
                this.$el.html("");
                this.collection.forEach(function(model) {
                    var view = new dm.AppSearchRowView({model: model});
                    this.$el.append(view.render().$el);
                }, this);
            }
            return this;
        },
        appChanged: function(appModel) {

        },
        attach: function() {
            this.isattached = true;
            this.render();
        },
        detach: function() {
            this.isattached = false;
        }
    });

    // sidebar view for app stores
    dm.AppGroupListView = Backbone.View.extend({
        initialize: function(){
            this.collection.on('add reset remove change:image', this.render, this);
            this.views = [];
        },
        render: function(){
            this.views.length = 0;
            this.$el.html("");
            this.collection.forEach(function(model) {
                model.set('text', model.get('id'), {silent:true});  // id is store name, assign it to text to display in sidebar row
                var view = new dm.SidebarRowView({model: model});
                this.$el.append(view.render().$el);
                this.views.push(view);
            }, this);
            return this;
        },
        indexOfView : function(model) {
            var id = model.get('id');
            for (var i = 0; i < this.views.length; i++) {
                if (this.views[i].model.get('id') == id) {
                    return i;
                }
            }
            return -1;
        },
        groupSelectionChange: function(model) { // appGroupSelectArrowModel in controller
            var selectedIndex = model.get('appGroupIndex');
            this.views.forEach($.proxy(function(view) {
                view.$el.find('.sidebar-option').removeClass('sidebar-option-selected')
                view.$el.find('.sidebar-text').removeClass('sidebar-text-selected')
            }, this));
            if (selectedIndex >= 0) {
                this.views[selectedIndex].$el.find('.sidebar-text').addClass('sidebar-text-selected')
                this.views[selectedIndex].$el.find('.sidebar-option').addClass('sidebar-option-selected')
            }
        },
        selectFirstGroup: function() {
            if (this.views.length > 0) {
                this.views[0].rowClicked();
            }
        },
        selectGroupByName: function(name) {
            for (var i = 0; i < this.views.length; i++) {
                if (this.views[i].model.get('id') == name) {
                    this.views[i].rowClicked();
                    break;
                }
            }
        }
    });

    // view of all apps for a store. collection gets replaced when another store is selected
    dm.AppSettingsListView = Backbone.View.extend({
        initialize: function(){
            this.isattached = false;
        },
        render: function(){
            if (this.isattached == true) {
                this.$el.html("");
                if (this.appGroupName == this.options.myAppGroup) {
                    var view = new dm.AppCreateRowView();
                    this.$el.append(view.render().$el);
                }
                this.collection.forEach(function(model) { // AppSettingsModel
                    var view = new dm.AppSettingRowView({model: model});
                    this.$el.append(view.render().$el);
                }, this);
            }
            return this;
        },
        changeCollection: function(newCollection, appGroupName) {
            if (this.collection != undefined) {
                this.collection.off('change reset remove', this.render, this);
            }
            this.collection = newCollection;
            this.collection.on('change reset remove', this.render, this);
            this.appGroupName = appGroupName;
            this.render();
        },
        attach: function() {
            this.isattached = true;
            this.render();
        },
        detach: function() {
            this.isattached = false;
        }
    });

    // view for one app from preference
    dm.AppSettingRowView = Backbone.View.extend({
        className: 'app-row-view',
        template: _.template(appRowHTML),
        events: {
            'mouseenter' : 'hoverIn',
            'mouseleave' : 'hoverOut',
            'click'   : 'runApp'
        },
        initialize: function(){
            this.model.on('change', this.render, this);
        },
        render: function(){
            this.$el.html(this.template(this.model.attributes));
            var buttonDiv = this.$el.find('.app-row-button-div');
            buttonDiv.html('<div class="app-remove-button"></div><i class="edit-button icon-edit"></i>');
            buttonDiv.hide();
            this.$el.find('.app-remove-button').click($.proxy(function(event) {
                event.stopPropagation();
                var settings = $.extend({}, this.model.attributes);
                Backbone.Events.trigger('remove-app-settings', settings);
            }, this));
            this.$el.find('.edit-button').click($.proxy(function(event) {
                event.stopPropagation();
                console.log("edit");
                Backbone.Events.trigger("start-edit-app", $.extend({}, this.model.attributes));
            }, this));
            if (this.model.get('storeName') == dm.myAppGroup) {
                this.$el.find('.app-config-name-text').hide();
            }

            return this;
        },
        hoverIn: function() {
            this.$el.find('.app-row-button-div').show();
        },
        hoverOut: function() {
            this.$el.find('.app-row-button-div').hide();
        },
        runApp: function() {
            this.model.launch();
            console.log('launching app ' + this.model.get('name'));
        }
    });


    // first row in My Applications to show Add an App button
    dm.AppCreateRowView = Backbone.View.extend({
        className: 'create-app-row-view',
        template: _.template(appRowHTML),
        model: new Backbone.Model({name:' ', storeName: ' ', description: ' ', applicationIcon:' '}),
        initialize: function(){
            this.$el.html(this.template(this.model.attributes));
            this.$el.find('.app-icon').hide();
        },
        render: function(){
            var button = this.$el.find('.app-row-button');
            button.html('Add an App').addClass('create-app-button').click($.proxy(function() {
                Backbone.Events.trigger('start-create-app');
            }, this));
            return this;
        }
    });

    dm.AppGroupSelectArrowView = Backbone.View.extend({
        initialize: function(){
            this.model.on('change', this.render, this);
        },
        render: function(){
            var index = this.model.get('appGroupIndex');
            if (index >= 0 ) {
                var top = index*40 + 25;
                this.$el.css({top: top + "px"}).show();
            } else {
                this.$el.hide();
            }
            return this;
        }
    });

<!-- Application edit template and views -->

    var appEditPage1Html = '<div class="app-edit-header" >Application Information</div>' +
        '<table id="app_info_table" class="settings-table">' +
        '<tbody>' +
            '<form accept-charset="UTF-8" class="edit_app_form" id="user_app_form" method="post" name="user_app_form">' +
            '<tr>' +
                '<td class="label_column">' +
                    '<div style="position: relative">' +
                    '<label for="app_name" id="label_app_name" >Name:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_name" name="name" size="29" type="text" placeholder="Application Name" value="<%= name %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column">' +
                    '<div style="position: relative">' +
                    '<label for="app_name" id="label_app_description">Description:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_description" name="description" size="29" type="text" placeholder="Enter a short description" value="<%= description %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column">' +
                    '<div style="position: relative">' +
                    '<label for="app_url" id="label_app_url">URL:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_url" name="url" size="29" type="text" placeholder="Application URL" value="<%= url %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column">' +
                    '<div style="position: relative">' +
                    '<label for="app_icon_url" id="label_app_icon_url">Icon URL:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_icon_url" name="icon_url" size="29" type="text" placeholder="Icon URL (PNG)" value="<%= iconUrl %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column">' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<div id="app-edit-next-button" class="app-row-button app-edit-button">Next</div>' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column_p2">' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<div>' +
                        '<div id="app-edit-error"></div>' +
                    '</div>' +
                '</td>' +
            '</tr>' +


        '</form>' +
        '</tbody>' +
        '</table>';


    var appEditWindowSizeHtml = '<div class="app-edit-header2">Window Size</div>' +
        '<table id="app_window_size_table" class="settings-table">' +
        '<tbody>' +
            '<form accept-charset="UTF-8" class="edit_app_form" id="window_size_form" method="post" name="window_size_form">' +
            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_default_width" id="label_app_default_width">Width:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_default_width" name="default_width" size="10" type="text" value="<%= defaultWidth %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_default_height" id="label_app_default_height">Height:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_default_height" name="default_height" size="10" type="text" value="<%= defaultHeight %>" >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_resizeable" id="label_app_resizeable">Resize:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_resizeable" name="resizeable" size="25" type="checkbox" <% if(resize) print("checked"); %> >' +
                '</td>' +
            '</tr>' +
        '</form>' +
        '</tbody>' +
        '</table>';


    var appEditWindowEffectHtml = '<div class="app-edit-header2">Window Effects</div>' +
        '<table id="app-window_effect_table" class="settings-table">' +
        '<tbody>' +
            '<form accept-charset="UTF-8" class="edit_app_form" id="window_effects_form" method="post" name="window_effects_form">' +
            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_show_frame" id="label_app_show_frame">Window Frame:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_show_frame" name="show_frame" size="25" type="checkbox" <% if(frame) print("checked"); %> >' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_rounded_corners" id="label_app_rounded_corners">Rounded Corners:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_rounded_corners" name="rounded_corners" style="height: 20px;" size="10" type="checkbox" <% if(roundedCorners) print("checked"); %> >' +
                '</td>' +
            '</tr>' +

            '<tr id="corner_round_height_row">' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative; text-align: right;">' +
                    '<label for="app_corner_round_height" id="label_app_corner_round_height">Corner Height:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_corner_round_height" name="corner_round_height" size="10" type="text" value="<%= cornerRoundHeight %>" >' +
                '</td>' +
            '</tr>' +

            '<tr id="corner_round_width_row">' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative; text-align: right;">' +
                    '<label for="app_corner_round_width" id="label_app_corner_round_width">Corner Width:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_corner_round_width" name="corner_round_width" size="10" type="text" value="<%= cornerRoundWidth %>" >' +
                '</td>' +
            '</tr>' +
        '</form>' +
        '</tbody>' +
        '</table>';


    var appEditWindowPositionHtml = '<div class="app-edit-header2">Window Positioning</div>' +
        '<table id="app_window_position_table" class="settings-table">' +
        '<tbody>' +
            '<form accept-charset="UTF-8" class="edit_app_form" id="window_position_form" method="post" name="window_position_form">' +
            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_draggable" id="label_app_draggable">Draggable:</label>' +
                    '</div>' +
                '</td>' +
                '<td class="input_column"> ' +
                    '<input class="long_input" id="app_draggable" name="draggable" size="25" type="checkbox" <% if(draggable) print("checked"); %> >' +
                '</td>' +
            '</tr>' +
            '<tr>' +
                '<td class="label_column_p2">' +
                    '<div style="position: relative">' +
                    '<label for="app_z_order" id="label_app_z_order">Z-Order:</label>' +
                    '</div>' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td colspan="2" class="input_column"> ' +
                    '<input id="app_zorder_none" style="margin-left: 25px;" name="z_order" type="radio" value="none" <% if(zOrder=="None") print("checked"); %> ><label for="app_zorder_none" class="app-edit-radio-label">None</label>' +
                    '<input id="app_always_on_top" style="margin-left: 25px;" name="z_order" type="radio" value="always_on_top" <% if(zOrder=="Top") print("checked"); %>><label for="app_always_on_top" class="app-edit-radio-label" >Top</label>' +
                    '<input id="app_always_on_bottom" style="margin-left: 25px;" name="z_order" type="radio" value="always_on_bottom" <% if(zOrder=="Bottom") print("checked"); %> ><label for="app_always_on_bottom" class="app-edit-radio-label">Bottom</label>' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td colspan="2" class="input_column"> ' +
                    '<div>' +
                        '<div id="app-edit-save-button" class="app-row-button app-edit-button">Save</div>' +
                        '<div id="app-edit-back-button" class="app-row-button app-edit-button">Back</div>' +
                    '</div>' +
                '</td>' +
            '</tr>' +

            '<tr>' +
                '<td colspan="2" class="input_column"> ' +
                    '<div id="app-edit-error"></div>' +
                '</td>' +
            '</tr>' +

        '</form>' +
        '</tbody>' +
        '</table>';

    var appEditPage2Html = '<div class="app-edit-header">Window Options</div>' +
                            appEditWindowSizeHtml +
                            appEditWindowEffectHtml +
                            appEditWindowPositionHtml;

    // one page 1
    dm.AppInfoEditPageView = Backbone.View.extend({
        className: 'app-edit-page-view',
        events: {
            'click #app-edit-next-button' : function() { Backbone.Events.trigger('app-edit-next-page');}
        },
        initialize: function(){
            this.template = _.template(appEditPage1Html);
        },
        render: function(){
            this.$el.html(this.template(this.model.attributes));
            this.delegateEvents();
            return this;
        },
        populateSubmitData: function(dataObj) {
            this.$el.find('.edit_app_form').each(function() {
                var arr = $(this).serializeArray();
                arr.forEach(function(e) {
                    dataObj[e.name] = e.value;
                 });
            });
        },
        validateSubmitData: function() {
            var data = {};
            this.populateSubmitData(data);
            this.model.clearErrors();
            this.model.hasString(data, 'name');
            this.model.hasString(data, 'description');
            this.model.hasString(data, 'url');
            if (this.model.hasErrors()) {
                return false;
            } else {
                this.clearError();
                return true;
            }
        },
        clearError: function() {
            this.$el.find('#app-edit-error').html("");
        }
    });


    dm.AppEditPage2View = Backbone.View.extend({
        className: 'app-edit-page-view',
        events: {
            'click #app-edit-back-button' : function() { Backbone.Events.trigger('app-edit-back-page');},
            'click #app-edit-save-button' : function() {
                                                         if ($('#app-edit-save-button').html() == 'Save') {
                                                             Backbone.Events.trigger('app-edit-save', this.model);
                                                             $('#app-edit-save-button').html('Saving');
                                                         }
                                                        },
            'click #app_rounded_corners'      : 'toggleRoundedCorners'
        },
        initialize: function(){
            this.template = _.template(appEditPage2Html);
        },
        render: function(){
            this.$el.html(this.template(this.model.attributes));
            this.delegateEvents();
            this.toggleRoundedCorners();
            return this;
        },
        toggleRoundedCorners: function() {
            var rc = this.$el.find('#app_rounded_corners');
            if (rc != undefined) {
                this.checkRoundedCorners($(rc).is(":checked"));
            }
        },
        populateSubmitData: function(dataObj) {
            dataObj['resizeable'] = false;
            dataObj['show_frame'] = false;
            dataObj['draggable'] = false;
            this.$el.find('.edit_app_form').each(function() {
                var arr = $(this).serializeArray();
                arr.forEach(function(e) {
                    if (e.name == 'resizeable' || e.name == 'show_frame' || e.name == 'draggable') {
                        // a checkbox is included only when it is checked
                        dataObj[e.name] = true;
                    }
                    else if (e.name == 'rounded_corners') {
                        // just means corner_width and cornver_height are editable
                        dataObj[e.name] = true;
                    }
                    else if (e.name == 'z_order') {
                        if (e.value != 'none') {
                            dataObj[e.value] = true;
                        }
                    }
                    else {
                        dataObj[e.name] = e.value;
                    }
                 });
            });
        },
        checkRoundedCorners: function(checked) {
            if (checked) {
                this.$el.find('#corner_round_width_row').show();
                this.$el.find('#corner_round_height_row').show();
                this.$el.find('#app_corner_round_height').val("5");
                this.$el.find('#app_corner_round_width').val("5");
            } else {
                this.$el.find('#corner_round_width_row').hide();
                this.$el.find('#corner_round_height_row').hide();
                this.$el.find('#app_corner_round_height').val("");
                this.$el.find('#app_corner_round_width').val("");
            }
        },
        validateSubmitData: function() {
            var data = {};
            this.populateSubmitData(data);
            this.hasPositiveInteger(data, 'default_height');
            this.hasPositiveInteger(data, 'default_width');
            if (data['rounded_corners'] == true) {
                this.hasPositiveInteger(data, 'corner_round_height');
                this.hasPositiveInteger(data, 'corner_round_width');
        }
            if (this.model.hasErrors()) {
                return false;
            } else {
                this.clearError();
                return true;
            }
        },
        clearError: function() {
            this.$el.find('#app-edit-error').html("");
        }
    });


    dm.AppEditPageListView = Backbone.View.extend({
        initialize: function(){
            this.pages = [];
            this.pages.push(new dm.AppInfoEditPageView({model: this.model}));
            this.pages.push(new dm.AppEditPage2View({model: this.model}));
            this.currentPage = 0;
            this.model.on('change:invalidValueError', this.showInvalidError, this);
            this.model.on('change:missingValueError', this.showMissingError, this);
        },
        render: function(){
            this.pages.forEach(function(p) {
                p.render();
                p.$el.find('#app-edit-error').html("");
            });
            this.currentPage = 0;
            this.$el.html(this.pages[this.currentPage].$el);
            return this;
        },
        pageDown: function() {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.$el.html(this.pages[this.currentPage].$el);
                this.pages[this.currentPage].delegateEvents();
            }
        },
        pageUp: function() {
            if (this.pages[this.currentPage].validateSubmitData() == true) {
            if (this.currentPage < (this.pages.length-1)) {
                this.currentPage++;
                this.$el.html(this.pages[this.currentPage].$el);
                this.pages[this.currentPage].delegateEvents();
            }
            }
        },
        attach: function() {
            this.render();
        },
        detach: function() {
        },
        getSubmitData: function() {
            var dataObj = {};
            this.pages.forEach(function(p) {
                p.populateSubmitData(dataObj);
            })
            return dataObj;
        },
        showInvalidError: function() {
            this.showError("invalid data", 'invalidValueError');
        },
        showMissingError: function() {
            this.showError("missing data", 'missingValueError');
        },
        showError: function(errorMsg, errorAttr) {
            var fieldName = this.model.get(errorAttr);
            if (fieldName != undefined) {
                var fieldLabel = this.getFieldLabel(fieldName);
                if (fieldLabel != undefined) {
                    this.$el.find('#app-edit-error').html(fieldLabel + " " + errorMsg);
                }
            }
        },
        getFieldLabel: function(fieldName) {
            // look for html of 'label for' for the field
            for (var index in this.pages) {
                var labelHtml = this.getFieldLabelFromPage(fieldName, this.pages[index]);
                if (labelHtml != undefined) {
                    return labelHtml;
                }
            }
        },
        getFieldLabelFromPage: function(fieldName, pageView) {
            var label = pageView.$el.find('#label_app_' + fieldName);
            if (label.length > 0) {
                return label.html();
            }
        },
        restoreSaveButton: function() {
            $('#app-edit-save-button').html('Save');
        }
    });

})();

