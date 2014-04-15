(function () {

    dm.AppDirectoryClient = function () {
        this.apps = {};
        this.appSettingsList = []; //A list of applications and their settings
        this.loginResourceReady = _.after(3, this.launchStartScreen);
        this.urlPath = location.href.substring(0, location.href.indexOf('index.html'));
        this.moduleName = 'deskbandmenu';
        this.loginRunning  = false;
        this.loginStatus = "";
    }

    dm.AppDirectoryClient.prototype = {

        initialize: function (callback) {
            console.log('AppDirectoryClient initialize');
            var me = this;
            fin.desktop.System.getDeviceId(function (data) {
                me.deviceId = data;
                me.loginResourceReady();
                console.log('AppDirectoryClient deviceId ' + me.deviceId);
            });
            fin.desktop.System.getVersion(function (data) {
                me.desktopVersion = data;
                me.loginResourceReady();
                console.log('AppDirectoryClient version ' + me.desktopVersion);
            });

            this.createAllSpecialApps(function() {
                me.loginResourceReady();
                me.setupEventListeners();
                if (callback) {
                    callback();
                }
            });

            var smIcon = me.urlPath + '/img/deskband.png';
            var smIconDisabled = me.urlPath + '/img/deskband_disabled.png';
            var smIconHover = me.urlPath + '/img/deskband_hover.png';

            //create Deskband Start Menu icons
            fin.desktop.System.installStartIcon({
                enabledIcon: smIcon,
                disabledIcon: smIconDisabled,
                hoverIcon: smIconHover
            });

        },

        launchStartScreen : function() {
            this.startEvalauting();
        },

        createAllSpecialApps: function(callback) {
            var me = this;
            var ds_width = 850;
            var ds_height = 584;
            fin.desktop.System.log("info", 'Launching desktop settings app...');
            me.systempanel = new fin.desktop.Window({
                name: 'System',
                url: location.href.replace('index.html', 'systempanel/index.html'),
                taskbarIcon: me.urlPath.replace('index.html', 'systempanel/index.html') + '/img/application_icon.png',
                defaultWidth: ds_width,
                defaultHeight: ds_height,
                defaultTop: (window.screen.height - ds_height) / 2,
                defaultLeft: (window.screen.width - ds_width) / 2,
                frame: true,
                resizable: true,
                autoShow: false,
                draggable: false,
                showTaskbarIcon: true,
                hideOnClose: true
            }, function () {
                me.login = new fin.desktop.Window({
                        name: 'Login',
                        url: location.href.replace('index.html', 'loginscreen/index.html'),
                        defaultWidth: 415,
                        defaultHeight: 289,
                        defaultTop: screen.availTop + ((screen.availHeight - 300) / 2),
                        defaultLeft: screen.availLeft + ((screen.availWidth - 360) / 2),
                        frame: false,
                        resizable: false,
                        autoShow: false,
                        cornerRounding: {
                            width: 8,
                            height: 8
                        },
                        alwaysOnTop: false,
                        showTaskbarIcon: false
                    }, function () {
                        fin.desktop.System.log("info", "Creating login screen");
                        callback.call(me);
                    });
                me.login.run = function (cb) {
                    me.login.getNativeWindow().run();
                    cb();
                };
            });
            me.systempanel.run = function () {
                me.systempanel.getNativeWindow().run();
            };

        },

        runWalkthroughApp: function() {
            var me = this;
            if (!this.walkthrough) {
                this.walkthrough = new fin.desktop.Application({
                    name: 'Walkthrough',
                    uuid: 'walkthrough',
                    url: location.href.replace(this.moduleName, 'walkthrough'),
                    applicationIcon: this.urlPath.replace(this.moduleName, 'walkthrough') + '/img/appstore_icon.png',
                    taskbarIcon: this.urlPath.replace(this.moduleName, 'walkthrough') + '/img/appstore_icon.png',
                    version: '1.0',
                    defaultTop: 0,
                    defaultLeft: 0,
                    defaultWidth: 500,
                    defaultHeight: 300,
                    opacity: 0.0,
                    frame: false,
                    shadow: false,
                    draggable: false,
                    showTaskbarIcon: false,
                    alwaysOnTop: true,
                    contextMenu: true,
                    resizable: false,
                    autoShow: false,
                    isAdmin: true,
                    hideOnClose: false,
                    /*alphaMask: {red: (132 / 255), green: (134 / 255), blue: (132 / 255)} */
                    alphaMask: {red:132, green: 134, blue: 132}
                }, function () {
                    fin.desktop.System.log("info", 'Launching walkthrough...');
                    me.walkthrough.run();
                });
            } else {
                me.walkthrough.run();
            }
        },


        setupEventListeners: function() {
            var me = this;
            var deskbandMenu = fin.desktop.Window.getCurrentWindow();
            /*fin.desktop.System.addEventListener("desktop-icon-clicked", function (data) {
                // show the start menu
                dm.interWindowBus.send(deskbandMenu.getNativeWindow(), "show-start-menu", data);
            });*/

            dm.interWindowBus.subscribe(this.login.getNativeWindow(), 'pass-credentials', function (data) {
                var username = data.username;
                var password = data.password;
                var token = data.token;
                fin.desktop.System.log("info", 'Login request received for: ' + username);
                me.authenticate(username, password, token);
            });

            dm.interWindowBus.subscribe(this.login.getNativeWindow(), 'exit-desktop', function (data) {
                fin.desktop.System.log("info", 'Exiting Desktop...');
                fin.desktop.Application.getCurrentApplication().close()
//                me.updateAppWindowInfo(function() {
//                fin.desktop.System.exit();
//                });
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'exit-desktop', function (data) {
                fin.desktop.System.log("info", 'Exiting Desktop...');
                fin.desktop.Application.getCurrentApplication().close()
//                me.updateAppWindowInfo(function() {
//                fin.desktop.System.exit();
//                });
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'request-login-status', function (msg) {
                dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'login-status', {status: me.loginStatus});
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'request-app-settings', function () {
                if (me.appSettingsList) {
                    dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'pass-app-settings', me.appSettingsList);
                }
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'save-app-settings', function (data) {
                me.saveAppSettings(data);
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'deskbandmenu-ready', function (data) {
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'create-app-settings', function (data) {
                var appVersion = {};
                appVersion.version = "1.0.0";
                appVersion.sortOrder = 1;
                appVersion.name = data.name;
                appVersion.description = data.description;
                appVersion.url = data.url;
                appVersion.iconUrl = data.icon_url;
                appVersion.draggable = data.draggable;
                appVersion.resizeable = data.resizeable;
                appVersion.showFrame = data.show_frame;
                appVersion.defaultHeight = data.default_height;
                appVersion.defaultWidth = data.default_width;
                if (data.rounded_corners == true) {
                    appVersion.cornerRoundHeight = data.corner_round_height;
                    appVersion.cornerRoundWidth = data.corner_round_width;
                } else {
                    appVersion.cornerRoundHeight = 0;
                    appVersion.cornerRoundWidth = 0;
                }
                appVersion.zBehavior = data.corner_round_width;
                if (data.always_on_bottom == true) {
                    appVersion.zBehavior = "onBottom";
                }
                if (data.always_on_top == true) {
                    appVersion.zBehavior = "onTop";
                }
                var app = {};
                app.versions = [appVersion];
                if (data.uuid != undefined) {
                    app.uuid = data.uuid;  // updating existing app
                }
                app.name = data.name;
                app.description = data.description;
                app.serviceName = data.name;
                app.discoverable= false;

                fin.desktop.System.log("info", "CREATING APP SETTINGS: Sending to server: " + JSON.stringify(data));
                $.ajax({
                   url: '/services/api/directory/apps',
                   type: 'POST',
                   data: JSON.stringify(app),
                   contentType:"application/json; charset=utf-8",
                   dataType:"json",
                   success: function(response){
                       var updateObj = {};
                       updateObj.isEnabled = true;
                       updateObj.launchOnLogin = true;
                       updateObj.isMyApp = true;
                       updateObj.uuid = response.uuid;
                       me.saveAppSettings([updateObj], function(settings) {
                           me.createAndLaunchApps(settings);
                           var ack = {};
                           ack.status = true;
                           ack.data = settings[0];
                           dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'create-app-settings-ack', ack);
                       });
                     },
                   error: function() {
                       fin.desktop.System.log("info", "Error creating app");
                       var ack = {};
                       ack.status = false;
                       ack.reason = 'Error saving app settings';
                       dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'create-app-settings-ack', ack);
                     }
                 });
            });

            dm.interWindowBus.subscribe(this.systempanel.getNativeWindow(), 'save-log', function (log) {
                var payload = {
                    name: log.name,
                    date: new Date(log.date).getTime(),
                    data: log.logData
                };
                fin.desktop.System.log("info", "SAVING LOG: " + log.name);
                $.ajax({
                    url: '/services/api/devices/' + this.deviceId + '/debuglog',
                    type: 'POST',
                    data: JSON.stringify(payload),
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    success: function(response){
                        var ack = {};
                        ack.status = true;
                        dm.interWindowBus.send(me.systempanel.getNativeWindow(), 'save-log-ack', ack);
                      },
                    error: function() {
                        fin.desktop.System.log("info", "Error uploading log");
                        dm.interWindowBus.send(me.systempanel.getNativeWindow(), 'save-log-ack', {
                            status: false,
                            response: "Could not save log."
                        });
                      }
                  });
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'show-login-screen', function () {
                me.runLoginScreen("", me.showLoginScreen);
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'start-walkthrough', function () {
                me.runWalkthroughApp();
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'show-log', function () {
                dm.interWindowBus.send(me.systempanel.getNativeWindow(), 'show-log');
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'show-cache', function () {
                dm.interWindowBus.send(me.systempanel.getNativeWindow(), 'show-cache');
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'show-processes', function () {
                dm.interWindowBus.send(me.systempanel.getNativeWindow(), 'show-processes');
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'request-logout', function (msg) {
                fin.desktop.System.log("info", "logout: Sending to server: ");
                $.ajax({
                    url: '/services/api/my/logout',
                    type: 'POST',
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    success: function(response){
                        fin.desktop.System.exit();
                      },
                    error: function() {
                        fin.desktop.System.exit();
                      }
                  });
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'search-apps', function (data) {
                fin.desktop.System.log("info", "search-apps: Sending to server: ");
                    fin.desktop.System.log("info", "search-apps: Sending to server: ");
                    $.ajax({
                        url: "/services/api/my/apps/searchables",
                        type: "GET",
                        contentType:"application/json; charset=utf-8",
                        dataType:"json",
                        success: function(data){
                            if (Array.isArray(data)) {
                                var appList = me.camelize(data);
                                dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'pass-search-apps', appList);
                            } else {
                                fin.desktop.System.log("info", "searchApps returns null");
                            }
                          },
                        error: function() {
                            fin.desktop.System.log("info", "Error  updateUserAppSettings");
                          }
                      });
            });

            fin.desktop.System.addEventListener('monitor-info-changed', function (monitorMsg) {
                fin.desktop.System.log("info", "Monitor Info Changed: " + JSON.stringify(monitorMsg));

                dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'hide-deskbandmenu', {});

                var monitorInfo = monitorMsg;

                fin.desktop.System.getAllWindows(function (windowsMsg) {

                    // Flatten out all parent windows and children windows into single array
                    var windows = [];

                    var rawWindowsArray = windowsMsg;

                    rawWindowsArray.forEach(function (rawWindowData) {
                        if (rawWindowData.uuid != "desktopcontroller") {
                            rawWindowData.childWindows.forEach(function (element) {
                                element.uuid = rawWindowData.uuid;
                                windows.push(element);
                            });
                            rawWindowData.mainWindow.uuid = rawWindowData.uuid;
                            windows.push(rawWindowData.mainWindow);
                        }
                    });

                    // Run window correction logic
                    me.rearrangeWindows(windows, monitorInfo);
                    me.adjustSystemNotification(monitorInfo);
                });
            });

            dm.interWindowBus.subscribe(deskbandMenu.getNativeWindow(), 'request-startup-launch-app', function (data) {
                console.error("request-startup-launch-app not supported")
            });
        },

        saveAppSettings: function(data, callback) {
            var me = this;
            var deskbandMenu = fin.desktop.Window.getCurrentWindow();
            data.forEach(function (record, id) {
                var updateObj = {};
                if (record.launchOnLogin != undefined) {
                    updateObj.running = record.launchOnLogin;
                }
                var reqTarget;
                if (record.isMyApp == true || me.userSettings == undefined) {
                    reqTarget = "deviceId=" + me.deviceId;
                } else {
                    reqTarget = "userId=" + me.userSettings.email;
                }
                var httpMethod = "POST";
                var url = '/services/api/my/apps/states/' + record.uuid + "?" + reqTarget;

                if (record.isEnabled == false) {
                    httpMethod = "DELETE";
                    url = '/services/api/my/apps/' + record.uuid + "?" + reqTarget;
                }
                $.ajax({
                    url: url,
                    type: httpMethod,
                    data: JSON.stringify(updateObj),
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    success: function(response){
                        if (callback) {
                            callback.call(me, response);
                        } else {
                            var ack = {};
                            ack.status = true;
                            ack.settings = [record];
                            if (httpMethod == "POST") {
                                ack.settings = response;
                                ack.settings.isMyApp = record.isMyApp;
                            }
                            me.createAndLaunchApps(ack.settings);
                            dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'save-app-settings-ack', ack);
                        }
                      },
                    error: function() {
                        fin.desktop.System.log("info", "Error  updateUserAppSettings");
                      }
                  });

                fin.desktop.System.log("info", "SAVING APP SETTINGS: Sending to server: " + JSON.stringify(updateObj));
            });
        },

        showLoginScreen: function() {
            var deskbandMenu = fin.desktop.Window.getCurrentWindow();
            dm.interWindowBus.send(this.login.getNativeWindow(), 'reset-login-screen', {autoShow: true});
            this.loginStatus = "";
            dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'login-status', {status: this.loginStatus});
        },


        authenticate: function(username, password, token) {
            var me = this;
            var deskbandMenu = fin.desktop.Window.getCurrentWindow();
            this.setLoadStatus('Authenticating...');
            var authPayload = {
                username: username,
                userAgent: window.navigator.userAgent,
                deviceId: this.deviceId,
                desktopVersion: this.desktopVersion
            };

            if (password) {
                authPayload.password = password;
            } else if (token) {
                authPayload.token = token;
            }

            $.ajax({
              url:'/services/api/my/authenticate',
              type: "POST",
              data: JSON.stringify(authPayload),
              contentType:"application/json; charset=utf-8",
              dataType:"json",
              success: function(response){
                  me.loginStatus = response.status;
                  //Update the login splash screen status
                  dm.interWindowBus.send(me.login.getNativeWindow(), 'login-status', {
                      status: response.status
                  });
                  dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'login-status', {
                      status: response.status
                  });

                  if (response.token && username) {
                      dm.interWindowBus.send(me.login.getNativeWindow(), 'pass-token', {
                          token: response.token,
                          username: username
                      });
                  }
                  if (response.pingFrequency) {
                      me.serverPingFrequency = response.pingFrequency;
                      // schedulePing();
                  }
                  if (response.status == "ok") {
                      me.setLoadStatus('Successfully logged in.');
                      $.ajaxSetup({
                          beforeSend: function(xhr) {
                              xhr.setRequestHeader('X-CSRF-Token',
                                  $('meta[name="csrf-token"]').attr('content'));
                          }
                      });
                      me.userSettings = {
                          email: username
                      };
                      me.launchUtilityApps();
                      me.retrieveAppSettings();
                  } else {
                      me.setLoadStatus('Authentication failed.');
                  }
                },
              error: function() {
                  me.setLoadStatus('Authentication request failed.');
                  me.runLoginScreen("", me.showLoginScreen);
                  dm.interWindowBus.send(me.login.getNativeWindow(), 'login-status', {
                      status: 'error',
                      message: 'Authentication failed: network error'
                    });
                }
            });
        },

        startEvalauting: function() {
            var me = this;
            this.setLoadStatus('Connecting...');
            var authPayload = {
                userAgent: window.navigator.userAgent,
                desktopVersion: this.desktopVersion
            };
            $.ajax({
               url: '/services/api/devices/' + this.deviceId + '/register',
               type: 'POST',
               data: JSON.stringify(authPayload),
               contentType:"application/json; charset=utf-8",
               dataType:"json",
               success: function(response){
                   dm.interWindowBus.send(me.login.getNativeWindow(), 'login-status', {
                        status: "ok"
                    });
                    me.setLoadStatus('Successfully connected.');
                    $.ajaxSetup({
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-CSRF-Token',
                                    $('meta[name="csrf-token"]').attr('content'));
                        }
                    });
                    me.launchUtilityApps();
                    me.retrieveMyAppSettings();
                 },
               error: function() {
                   me.setLoadStatus('Free Trial request failed.');
                   dm.interWindowBus.send(me.login.getNativeWindow(), 'login-status', {
                       status: 'error',
                       message: 'Free Trial failed: network error'
                   });
                 }
             });
        },

        launchUtilityApps: function() {
            this.systempanel.run();
        },


        retrieveMyAppSettings: function() {
            var me = this;
            this.setLoadStatus('Retrieving my user settings...');
            $.get('/services/api/my/apps?deviceId=' + this.deviceId, function (data) {
                if (Array.isArray(data)) {
                    data.forEach(function (appSettings) {
                        appSettings.isMyApp = true;
                    });
                    me.procAppSettings(data);
                }
                me.runLoginScreen();
            });
        },

        retrieveAppSettings: function() {
            var me = this;
            this.setLoadStatus('Retrieving user settings...');
            $.get('/services/api/my/apps?userId=' + this.userSettings.email, function (data) {
                if (Array.isArray(data)) {
                    me.procAppSettings(data);
                }
                if (me.login) me.login.hide();
                me.updateMonitorInfo();
            });
        },

        retrieveAppSettingsByUuid: function(appUuid, callback, errorCallback) {
            var me = this;
            fin.desktop.System.log("info", "retrieveAppSettingsByUuid " + appUuid);
            $.get("/services/api/my/apps/" + appUuid, function (data){
                fin.desktop.System.log("info", JSON.stringify(data));
                if (Array.isArray(data)) {
                    data.forEach(function (appSettings) {
                        appSettings.isEnabled = true;
                        appSettings.launchOnLogin = true;
                        appSettings.isMyApp = true;
                    });
                    me.procAppSettings(data);
                    if (callback) callback.call(me);
                } else if (data.status == "error" && errorCallback) {
                    // Need to show modal dialog window here
                    if (errorCallback) errorCallback.call(me);
                }
            });
        },

        procAppSettings: function(data) {
            var deskbandMenu = fin.desktop.Window.getCurrentWindow();
            if (Array.isArray(data)) {
                var settingsList = this.camelize(data);
                if (deskbandMenu) {
                    dm.interWindowBus.send(deskbandMenu.getNativeWindow(), 'pass-app-settings', settingsList);
                }
                fin.desktop.System.log("info", JSON.stringify(data), JSON.stringify(settingsList));
                console.log(settingsList);
                if (settingsList.length > 0) {
                    this.setLoadStatus('Creating applications...');
                    this.createAndLaunchApps(settingsList);
                } else {
                    if (this.login) this.login.hide();
                }
            } else {
                if (this.login) this.login.hide();
            }
        },

        createAndLaunchApps: function(settingsList) {
            var me = this;
            if (this.login) this.login.hide();

            settingsList.forEach(function (appSettings) {
                if (appSettings.isEnabled && appSettings.launchOnLogin) {
                    me.createAndLaunchApp(appSettings);
                } else {
                    me.closeApp(appSettings);
                }

                var found = false;
                me.appSettingsList.forEach(function (el) {
                    if (el.uuid == appSettings.uuid) {
                        found = true;
                    }
                });
                if (found == false) {
                    me.appSettingsList.push(appSettings);
                }
                console.log('appSettingsList.length ' + me.appSettingsList.length);
            });

            console.log('showing startup menu');
            setTimeout(function () {
                if ($.isEmptyObject(me.apps)) {
                    fin.desktop.System.showStartWindow();
                }
            }, 2000);
        },

        createAndLaunchApp: function(appSettings) {
            var me = this;
            var callback = function () {
                if (appSettings.launchOnLogin) {
                    console.log("Launching app: " + appSettings.uuid);
                    me.apps[appSettings.uuid].run();
                }
            };

            if (this.apps[appSettings.uuid] == undefined) {
                if (!appSettings.applicationIcon) {
                    appSettings.applicationIcon = 'http://appdemo.openf.in/defaulticons/' + appSettings.name.charAt(0).toLowerCase() + '-icon.png';
                }
                this.apps[appSettings.uuid] = new fin.desktop.Application(appSettings, callback, callback);
            } else {
                callback.call(window);
            }
        },

        closeApp: function(appSettings) {
            if (this.apps[appSettings.uuid] != undefined) {
                fin.desktop.System.log("info", "closing app " + appSettings.uuid);
                this.apps[appSettings.uuid].remove();
                delete this.apps[appSettings.uuid];
            }
        },


        runLoginScreen: function(logo, callback) {
            var me = this;
            if (this.loginRunning == false) {
                console.log("Running login screen");
                this.login.run(function () {
                    this.loginRunning = true;
                    dm.interWindowBus.subscribe(me.login.getNativeWindow(), 'login-screen-ready', function () {
                        console.log("LOGIN SCREEN READY!");
                        if (logo != undefined) {
                            dm.interWindowBus.send(me.login.getNativeWindow(), 'logo', {
                                logo: logo
                            });
                        }
                    });
                    if (callback != undefined) {
                        callback.call(me);
                    }
                });
            } else {
                if (callback != undefined) {
                    callback.call(me);
                }
            }
        },

        updateMonitorInfo: function() {
            fin.desktop.System.getMonitorInfo(function (event) {
                var monitorInfo = event;
    //            $.post("/updateMonitorSettings", {desktopUuid: deviceId, settings: monitorInfo}, function (response) {
    //                var status = response.status;
    //                fin.desktop.System.log("info", "updated monitor settings with status " + status);
    //            });
            });
        },

        updateAppWindowInfo: function(callback) {
            var me = this;
            fin.desktop.System.log("info", 'calling updateAppWindowInfo');
            fin.desktop.System.getAllWindows(function(event){
                var appStates = {};  // appId -> state
                if (Array.isArray(event)) {
                    event.forEach(function (appWindow) {
                        var appId = appWindow.uuid;
                        var stateList = [];
                        if (appWindow.mainWindow) {
                            var wstate = parseWindowState(appWindow.mainWindow);
                            wstate.isMain = true;
                            stateList.push(wstate);
                        }
                        if (appWindow.childWindows) {
                            appWindow.childWindows.forEach(function (childWindow) {
                                var wstate = parseWindowState(childWindow);
                                wstate.isMain = false;
                                stateList.push(wstate);
                            });
                        }
                        appStates[appId] = stateList;
                    });
                }
                Object.keys(appStates).forEach(function(appId) {
                     var windowStates = {};
                     windowStates.windows = appStates[appId];
                     $.ajax({
                        url: '/services/api/devices/' + me.deviceId + '/windowStates/' + appId,
                        type: 'POST',
                        data: JSON.stringify(windowStates),
                        contentType:"application/json; charset=utf-8",
                        dataType:"json",
                        success: function(response){
                          },
                        error: function() {
                            fin.desktop.System.log("error", 'error updating updateAppWindowInfo');
                          }
                      });
                   });
                if (callback) {
                    callback.call(me);
                }
            });
        },


        rearrangeWindows: function(windows, monitorInfo) {

            fin.desktop.System.log("info", "rearrangeWindows: " + JSON.stringify(monitorInfo));

            windows.forEach(function (wnd) {
                var w = fin.desktop.Window.wrap(wnd.uuid, wnd.name);

                // Flatten out all monitors into single array
                var monitors = [];

                // Non primary monitor flattening
                monitorInfo.nonPrimaryMonitors.forEach(function (nonPrimaryMonitor) {
                    var ar = nonPrimaryMonitor.availableRect;

                    monitors.push({
                        left: ar.left,
                        right: ar.right,
                        top: ar.top,
                        bottom: ar.bottom,
                        isPrimary: false
                    });

                });

                var ar = monitorInfo.primaryMonitor.availableRect;
                monitors.push({
                    left: ar.left,
                    right: ar.right,
                    top: ar.top,
                    bottom: ar.bottom,
                    isPrimary: true
                });

                fin.desktop.System.log("info", "rearrangeWindows: " + 'Moving Window[' + wnd.uuid + ' : ' + wnd.name + ']');

                // Find collision case (none, one or many)
                var collidingMonitors = [];
                var collisionFound = false;
                var closestMonitor = monitorInfo.primaryMonitor.availableRect;
                var windowOrigin = {x: wnd.left, y: wnd.top};
                var closestPoint = getOriginInsideMonitorRect(wnd, monitorInfo.primaryMonitor.availableRect);
                var closestDistance = lineDistance(windowOrigin, closestPoint);
                var uuid = wnd.uuid;
                var name = wnd.name;

                if (uuid == "deskbandmenu") {
                    // Handled by deskbandmenu when shown
                } else if (uuid == "deskbandmenu" && name == "loginscreen") {
                    // center on primary monitor
                    closestMonitor = monitorInfo.primaryMonitor.availableRect;
                    w.moveTo(closestMonitor.right - ((closestMonitor.right - closestMonitor.left) / 2) - ((wnd.right - wnd.left) / 2),
                            closestMonitor.bottom - ((closestMonitor.bottom - closestMonitor.top) / 2) - ((wnd.bottom - wnd.top) / 2));

                } else {
                    monitors.forEach(function (monitorItr) {
                        var monitorClosestPoint = getOriginInsideMonitorRect(wnd, monitorItr);
                        var monitorOriginDistance = lineDistance(windowOrigin, monitorClosestPoint);

                        if (!collisionFound && monitorOriginDistance < closestDistance) {
                            closestMonitor = monitorItr;
                            closestDistance = monitorOriginDistance;
                            closestPoint = monitorClosestPoint;
                        }

                        if (intersectRect(wnd, monitorItr)) {
                            collidingMonitors.push(monitorItr);

                            if (!collisionFound) {
                                closestMonitor = monitorItr;
                                closestDistance = monitorOriginDistance;
                                closestPoint = monitorClosestPoint;
                            }
                            else {
                                if (monitorOriginDistance < closestDistance) {
                                    closestMonitor = monitorItr;
                                    closestDistance = monitorOriginDistance;
                                    closestPoint = monitorClosestPoint;
                                }
                            }

                            collisionFound = true;
                        }
                    });

                    fin.desktop.System.log("info", "rearrangeWindows-closestPoint: X=" + closestPoint.x + " Y=" + closestPoint.y);
                    w.moveTo(closestPoint.x, closestPoint.y);
                }
            });

            function intersectRect(r1, r2) {
                return !(r2.left > r1.right ||
                        r2.right < r1.left ||
                        r2.top > r1.bottom ||
                        r2.bottom < r1.top);
            }

            function getOriginInsideMonitorRect(windowRect, monitorRect) {
                var origin = new Object();
                var windowDimensions = {width: (windowRect.right - windowRect.left), height: (windowRect.bottom - windowRect.top)};
                var monitorDimensions = {width: (monitorRect.right - monitorRect.left), height: (monitorRect.bottom - monitorRect.top)};
                var screenPadding = {bottom: 20, left: 20, right: 20, top: 20};

                var padding = {left: 0 + screenPadding.left,
                    top: 0 + screenPadding.top,
                    right: Math.min(windowDimensions.width + (screenPadding.left + screenPadding.right), monitorDimensions.width - (screenPadding.left + screenPadding.right)),
                    bottom: Math.min(windowDimensions.height + (screenPadding.top + screenPadding.bottom), monitorDimensions.height - (screenPadding.top + screenPadding.bottom))};

                origin.x = Math.max(windowRect.left, monitorRect.left + padding.left);
                origin.x = Math.min(origin.x, monitorRect.right - padding.right);
                origin.y = Math.max(windowRect.top, monitorRect.top + padding.top);
                origin.y = Math.min(origin.y, monitorRect.bottom - padding.bottom);

                return origin;
            }

            function lineDistance(point1, point2) {
                var xs = 0;
                var ys = 0;

                xs = point2.x - point1.x;
                xs = xs * xs;

                ys = point2.y - point1.y;
                ys = ys * ys;

                return Math.abs(Math.sqrt(xs + ys));
            }
        },

        setLoadStatus: function(msg) {
            fin.desktop.System.log("info", msg);
            fin.desktop.InterApplicationBus.send('desktopcontroller', 'show-quick-loading-status', {status: msg});
        },

        camelize: function (dataArray) {
            fin.desktop.System.log("info", 'camelizing data');
            var array = [];
            dataArray.forEach(function (element) {
                var obj = {};
                for (var key in element) {
                    obj[$.camelCase(key.replace(/_/g, '-'))] = element[key];
                }
                array.push(obj);
            });
            return array;
        }


    }

})();
