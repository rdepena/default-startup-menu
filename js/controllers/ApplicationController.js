(function () {
    appIconColors = ["#ff0d00", "#ff9700", "#0c5aa6", "#00c618"];

    dm.ApplicationController = function () {
        this.appDictionaryModel = new dm.AppDictionaryModel();        // for search
        this.appSettingsCollection = new dm.AppSettingsCollection();  // used as quick map of uuid -> appsettings
        dm.myAppGroup = "My Applications";  // all apps without stores go here
    };

    dm.ApplicationController.prototype = {
        initialize: function () {
            // create app group section in sidebar
            this.appStoreCollection = new dm.AppGroupCollection();        // collection of stores, each store is another collection with appsettings
            this.appGroupListView = new dm.AppGroupListView({el:$('#sidebar-app-list-container'), collection: this.appStoreCollection});
            this.appGroupListView.render();
            this.appSettingListView = new dm.AppSettingsListView({el: $('#startupmenu-detail-container'), myAppGroup: dm.myAppGroup });  // app view for selected store

            this.appGroupSelectArrowModel = new Backbone.Model();
            this.appGroupSelectArrowView  = new dm.AppGroupSelectArrowView({el: $('#sidebar-selection-arrow'), model: this.appGroupSelectArrowModel });
            this.appGroupListView.listenTo(this.appGroupSelectArrowModel, "change", this.appGroupListView.groupSelectionChange);


            // create desktop maintenance section in sidebar
            this.maintRowCollection = new dm.SidebarRowCollection();
            this.maintRowCollection.add(new dm.SidebarRowModel({text:'Processes', id:'processes-settings-button', image: 'img/processes.png',
                        callBack: this.showProcesses}));
            this.maintRowCollection.add(new dm.SidebarRowModel({text:'Cache', id:'cache-settings-button', image: 'img/cache.png',
                        callBack: this.showCache}));
            this.maintRowCollection.add(new dm.SidebarRowModel({text:'Logs', id: 'logs-settings-button', image: 'img/logs.png',
                        callBack: this.showLogs}));
            this.maintSectionView = new dm.SidebarSectionView({el:$('#sidebar-desktop-maint-container'), collection: this.maintRowCollection});
            this.maintSectionView.render();

            // create desktop self help section in sidebar
            this.helpRowCollection = new dm.SidebarRowCollection();
            // this.helpRowCollection.add(new dm.SidebarRowModel({id:'feedback', text:'Feedback', image:'img/feedback.png', callBack: this.feedback}));
            this.helpSectionView = new dm.SidebarSectionView({el:$('#sidebar-help-container'), collection: this.helpRowCollection});
            this.helpSectionView.render();

            // create desktop search section in sidebar
            this.searchRowViews = [];
            this.searchRowViews.push(new dm.SideBarSearchRowView({model: new dm.SidebarRowModel({id:'app-search', callBack: this.search})}));
            this.searchSectionView = new dm.SidebarSectionView ({el:$('#sidebar-app-search-container'), rowViews: this.searchRowViews});
            this.searchSectionView.render();

            this.buttonRowCollection = new dm.SidebarRowCollection();

            this.authButtonModel = new dm.SidebarRowModel({id: 'sidebar-login-button', text:'Login', callBack: $.proxy(this.authButtonClick, this)});
            this.buttonRowCollection.add(new dm.SidebarRowModel({id: 'sidebar-exit-button', text:'Exit', callBack: this.exitDesktop}));
            this.buttonRowView = new dm.SideBarButtonRowView({collection: this.buttonRowCollection});
            this.footerSectionView = new dm.SidebarSectionView ({el:$('#sidebar-footer-container'), rowViews: [this.buttonRowView]});
            this.footerSectionView.render();
            $('#sidebar-footer-container .sidebar-separator').remove();

            this.appSearchCollection = new dm.AppSearchCollection();
            this.appSearchCollection.listenTo(this.appSettingsCollection, "add change", this.appSearchCollection.updateAppSettings);
            this.appSearchListView = new dm.AppSearchListView({el:$('#startupmenu-detail-container'), collection: this.appSearchCollection});
            this.appSearchCollection.listenTo(this.appDictionaryModel, "change:filterList", this.appSearchCollection.refresh);

            this.appEditModel = new  dm.AppEditModel();
            this.appEditPageListView = new dm.AppEditPageListView({el: $('#startupmenu-detail-container'), model: this.appEditModel });


            Backbone.Events.on('sidebar-view-click', this.changeView, this);
            Backbone.Events.on('sidebar-search', this.search, this);
            Backbone.Events.on('start-create-app', this.editNewApp, this);
            Backbone.Events.on("start-edit-app", this.editApp, this);
            Backbone.Events.on('app-edit-next-page', function() {
                this.appEditPageListView.pageUp();
            }, this);
            Backbone.Events.on('app-edit-back-page', function() {
                this.appEditPageListView.pageDown();
            }, this);
            Backbone.Events.on('app-edit-save', this.saveApp, this);


            this.subscribeToDataTopics();

            this.blurTime = new Date().getTime();
            this.waitingToShow = false;
            this.ignoreToggleDuration = 200;
            this.isSubscribedToBlur = false;

            dm.bus.send( 'deskbandmenu-ready');
        },

        changeView: function(model) {
            console.log("calling changeView");
            if (model.get('appGroup') != undefined) {
                var appGroup = model.get('appGroup');
                this.appSettingListView.changeCollection(appGroup, model.get('id'));
                this.updateDetailView(this.appSettingListView, true);
                this.appGroupSelectArrowModel.set('appGroupIndex', this.appGroupListView.indexOfView(model));
            }
            else if (model.get('callBack') != undefined) {
                model.get('callBack').call(this);
            }
        },

        updateDetailView: function(view, hideGroupSelectArrow) {
            if (hideGroupSelectArrow == true) {
                this.appGroupSelectArrowModel.set('appGroupIndex', -1);  // hide the arrow
            }
            if (this.currentDetailView != undefined) {
                if (this.currentDetailView.detach != undefined) {
                    this.currentDetailView.detach();
                }
            }
            this.currentDetailView = view;
            this.currentDetailView.attach();
        },

        search: function(searchString, model) {
            this.appDictionaryModel.search(searchString, this.appSettingsCollection);
            this.updateDetailView(this.appSearchListView, true);
        },

        showProcesses: function() {
            fin.desktop.Window.getCurrent().hide();
            dm.bus.send( 'show-processes');
        },

        showCache: function() {
            fin.desktop.Window.getCurrent().hide();
            dm.bus.send( 'show-cache');
        },

        showLogs: function() {
            fin.desktop.Window.getCurrent().hide();
            dm.bus.send( 'show-log');
        },

        takeATour: function() {
            fin.desktop.Window.getCurrent().hide();
            dm.bus.send('start-walkthrough');
        },

        feedback: function() {
            window.alert('join OpenFin in HipChat')
        },

        authButtonClick: function() {
            if (this.loginStatus == 'ok') {
                dm.bus.send( 'request-logout', {});
            } else {
                dm.bus.send('show-login-screen', {});
            }
        },

        exitDesktop: function() {
            fin.desktop.System.exit();
            dm.bus.send( 'exit-desktop', {});
        },
        canToggle: function() {
            var me = this;
            return (new Date().getTime()) - me.blurTime >= me.ignoreToggleDuration;
        },
        subscribeToDataTopics: function () {
            var me = this;
//            dm.bus.subscribe('*', 'show-create-application', function(msg){
//                console.log("RECEIVED show-create-application ");
//                Backbone.Events.on('show-app-description-view');
//            });

            dm.bus.subscribe( 'login-status', $.proxy(function(msg){
                console.log("RECEIVED login-status " + msg);
                this.loginStatus = msg.status;
                if (this.loginStatus == 'ok') {
                    this.authButtonModel.set('text', 'Logout');
                } else {
                    this.authButtonModel.set('text', 'Login');
                    this.removeStoreApps();
                    this.appGroupListView.selectFirstGroup();
                }
                dm.bus.send( 'search-apps');
            }, this));
            dm.bus.send( 'request-login-status');  // in case controller has appSettings already

            fin.desktop.System.addEventListener("show-start-window", function (msg) {
                console.log("SHOW START WINDOW MESSAGE");
                if (msg.x == -1 && msg.y == -1 && msg.edge == -1) {
                    me.showStartWindow(undefined, undefined, {toggle: (typeof msg.toggle != 'undefined'? msg.toggle : true)});
                }
            });

//            fin.desktop.System.addEventListener('desktop-icon-clicked', function (msg) {
//                console.info("Desktop Icon Clicked");
//                var appUuid = msg['launchAppUuid'];
//                if(typeof appUuid == "string" &&
//                   appUuid.length > 0) {
//                    me.launchAppByUuid(appUuid);
//                } else {
//                    me.showStartWindow();
//                }
//            });

            fin.desktop.System.addEventListener("deskband-icon-clicked", function (event) {
                var x = event.x;
                var y = event.y;

                me.showStartWindow(x, y);
            });

            fin.desktop.System.addEventListener("hide-start-window", function(event){
                me.hideStartWindow();
            });

            dm.bus.subscribe("show-start-menu", function () {
                me.showStartWindow();
            });

            dm.bus.subscribe("hide-start-menu", function () {
                me.hideStartWindow();
            });

            dm.bus.subscribe( 'pass-search-apps', function(data){
                me.appDictionaryModel.set('appDictionary', data);
            });


            dm.bus.subscribe( 'pass-app-settings', $.proxy(function (settingsList) {
                settingsList.forEach($.proxy(function(settings) {
                    this.validateSettings(settings);
                }, this));
                this.appSettingsCollection.refresh(settingsList);
                this.appStoreCollection.refresh(settingsList);
                var myAppModel = this.appStoreCollection.get(dm.myAppGroup);
                if (myAppModel != undefined && myAppModel.appCount() > 0) {
                    this.appGroupListView.selectGroupByName(dm.myAppGroup);
                } else {
                    this.appGroupListView.selectFirstGroup();
                }
            }, this));
            dm.bus.send( 'request-app-settings');  // in case controller has appSettings already

            Backbone.Events.on('add-app-settings', $.proxy(function(settings) {
                settings.isEnabled = true;
                dm.bus.send( 'save-app-settings', [settings]);
            }, this));

            Backbone.Events.on('remove-app-settings', $.proxy(function(settings) {
                settings.isEnabled = false;
                dm.bus.send( 'save-app-settings', [settings]);
            }, this));

            dm.bus.subscribe( 'save-app-settings-ack', $.proxy(function (msg) {
                if (msg.status == true) {
                    //checking this because settings can be empty for offline
                    if(msg.settings){
                        msg.settings.forEach($.proxy(function(settings) {
                            this.validateSettings(settings);
                            this.appSettingsCollection.updateApp(settings);
                            this.appStoreCollection.updateApp(settings);
                        }, this));
                    }
                } else {
                    console.error("Failed create-app-settings " + msg);
                }
            }, this));

            dm.bus.subscribe( 'create-app-settings-ack', $.proxy(function (msg) {
                if (msg.status == true) {
                    this.appEditPageListView.restoreSaveButton();
                    var settings = msg.data;
                    this.validateSettings(settings);
                    this.appSettingsCollection.updateApp(settings);
                    this.appStoreCollection.updateApp(settings);
                    // change detail view to My App
                    var myAppModel = this.appStoreCollection.get(dm.myAppGroup);
                    if (myAppModel != undefined) {
                        this.changeView(myAppModel);
                    }
                    fin.desktop.System.log("info", "create-app-settings processed " + msg);
                } else {
                    fin.desktop.System.log("error", "Failed create-app-settings " + msg);
                }
            }, this));

            Backbone.Events.on('start-application', $.proxy(function(settings) {
                // go through controller so launchOnLogin is saved on the server
                settings.launchOnLogin = true;
                dm.bus.send( 'save-app-settings', [settings]);
            }, this));

            Backbone.Events.on('application-closed', $.proxy(function(settings) {
                // go through controller so launchOnLogin is saved on the server
                if (this.loginStatus == 'ok' || settings.isMyApp == true) {  // ignore close events of store apps during logoff
                    settings.launchOnLogin = false;
                    dm.bus.send( 'save-app-settings', [settings]);
                }
            }, this));

            dm.bus.subscribe('launch-app', $.proxy(function (data) {
                console.log('processing launch-app ' + JSON.stringify(data));
                if ($.isArray(data)) {
                    data.forEach($.proxy(function(item) {
                        this.launchAppByUuid(item);
                    }, this));
                } else {
                    this.launchAppByUuid(data)
                }
            }, this));
        },

        validateSettings: function(settings) {
            if (settings.storeName == undefined) {
                settings.storeName = dm.myAppGroup;
            }
        },

        editNewApp: function() {
            this.appEditModel.applyDefaults();
            this.updateDetailView(this.appEditPageListView, false);
        },

        editApp: function (settings) {
            settings.iconUrl = settings.applicationIcon;
            if (settings.always_on_top) {
                settings.zOrder = "Top";
            } else if (settings.always_on_bottom) {
                settings.zOrder = "Bottom";
            } else {
                settings.zOrder = "None";
            }
            this.appEditModel.updateAppSettings(settings);
            this.updateDetailView(this.appEditPageListView, false);
        },

        saveApp: function() {
            var settings = this.appEditPageListView.getSubmitData();
            if (this.appEditModel.has('uuid') == true) {
                settings.uuid = this.appEditModel.get('uuid'); // updating existing app
            }
            console.info("creating app: " + settings);
            if (this.appEditModel.validateSubmitData(settings) == true) {
                dm.bus.send( 'create-app-settings', settings);
            }
        },

        launchAppByUuid: function(uuid) {
            var appModel = this.appSettingsCollection.get(uuid);
            if (appModel != undefined) {
                if (appModel.get('isEnabled') == true) {
                    appModel.launch();
                } else {
                    console.error("Error launching app not enabled " + uuid);
                }
            } else {
                console.error("Error launching missing app " + uuid);
            }
        },

        removeStoreApps: function() {
            // close all apps started in evaluation or login mode
            var me = this;
            fin.desktop.System.getProcessList(function (data) {
                var processList = data;
                for (index in processList) {
                    var process = processList[index];
                    var settingModel = me.appSettingsCollection.get(process.uuid);
                    if (settingModel != undefined) {
                        if (settingModel.get('isMyApp') != true) {
                            var app = fin.desktop.Application.wrap(process.uuid);
                            app.close();
                        }
                    }
                }
            });
            this.appSettingsCollection.forEach(function(model) {
                if (model.get('isMyApp') != true) {
                    this.appStoreCollection.removeApp(model.attributes);
                }
            }, this);
        },
        hideStartWindow: function() {
            var me = this;
            var wnd = fin.desktop.Window.getCurrent();
            me.blurTime = new Date().getTime();
            wnd.animate({
                opacity: {
                    opacity: 0,
                    duration: 100
                }
            });
            setTimeout(function () {
                wnd.hide();
                me.blurTime = new Date().getTime();
            }, 100);
        },
        showStartWindow: function (requestedX, requestedY, options) {
            var config = options || {toggle: true};

            var doNotGiveFocus = config.noFocus || false;
            var toggleShow = config.toggle;

            var me = this;
            if(!me.isSubscribedToBlur) {
                me.isSubscribedToBlur = true;
                var wnd = fin.desktop.Window.getCurrent();
                wnd.addEventListener('blurred', function(event) {
                    if(!me.waitingToShow) {
                        me.hideStartWindow();
                    }
                });
            }

            // ignore if blur was too recent (only if toggle behavior is desired)
            if(config.toggle && !me.canToggle()) {
                return;
            }

            // Check if the window is showing when toggling
            if(config.toggle) {
                fin.desktop.Window.getCurrent().isShowing(function(showing) {
                    var showWindow = !showing;

                    // Toggle show state
                    if(showWindow) {
                        doShowStartWindow();
                    } else {
                        me.hideStartWindow();
                    }
                });
            } else {
                doShowStartWindow();
            }


            function doShowStartWindow() {
                var monitorInfo;

                fin.desktop.System.getMonitorInfo(function (evt) {
                    monitorInfo = evt;

                    var monitors = monitorInfo.nonPrimaryMonitors;

                    monitors.push(monitorInfo.primaryMonitor);

                    var defaultToPrimaryMonitor = true;

                    for (var i= 0,len=monitors.length; i < len; i++) {
                        var avail = monitors[i].availableRect;
                        var total = monitors[i].monitorRect;

                        if (!areRectsEqual(avail,total)) {
                            positionStartMenu(avail,total);
                            defaultToPrimaryMonitor = false;
                            break;
                        }
                    }

                    if (defaultToPrimaryMonitor) {
                        positionStartMenu(monitorInfo.primaryMonitor.availableRect, monitorInfo.primaryMonitor.monitorRect);
                    }

                });

                function areRectsEqual(rect1, rect2) {
                    return (rect1.top == rect2.top
                            && rect1.bottom == rect2.bottom
                            && rect1.left == rect2.left
                            && rect1.right == rect2.right);
                }

                var windowHeight = 490;
                var windowWidth = 500;

                function positionStartMenu(avail, total) {

                    console.log("POSITION START MENU AT" );

                    var w = fin.desktop.Window.getCurrent();

                    var x=0, y=0;

                    if (!requestedX || !requestedY) {

                        if (total.top < avail.top) {
                            // top
                            if (!requestedX) {
                                x = avail.right - windowWidth;                            
                            }
                            else {
                                x = requestedX;
                            }
                            y = avail.top;

                        } else if (total.left < avail.left) {
                            //left
                            x = avail.left;
                            y = avail.bottom - windowHeight;
                        } else if (total.right > avail.right) {
                            //right
                            x = avail.right - windowWidth;
                            y = avail.bottom - windowHeight;

                        } else if (total.bottom > avail.bottom) {
                            //bottom
                            x = avail.right - windowWidth;
                            y = avail.bottom - windowHeight;
                        }  else {
                            x = avail.right - windowWidth;
                            y = avail.bottom - windowHeight;
                        }

                    } else {
                        x = requestedX;
                        y = requestedY;
                    }

                    var spacer = 0;

                    x = Math.max(avail.left + spacer, Math.min(x, avail.right - windowWidth - spacer));
                    y = Math.max(avail.top + spacer, Math.min(y, avail.bottom - windowHeight - spacer));

                    w.resizeTo(windowWidth, windowHeight, "top-left", function () {
                        me.waitingToShow = true;
                        if (doNotGiveFocus) {
                            w.moveTo(x, y);
                            w.show(function() {
                                me.waitingToShow = false;
                            });
                        } else {
                            w.showAt(x, y, toggleShow, function(){
                                w.setAsForeground(function(){
                                    w.focus(function(){
                                        me.waitingToShow = false;
                                    });
                                });
                            });
                        }
                        w.animate({
                            opacity: {
                                opacity: 1,
                                duration: 200
                            }
                        });
                    });
                }
            }
        }
    }

})();
