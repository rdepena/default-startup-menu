var ds = ds || {};

(function () {

    dm.AppDictionaryModel = Backbone.Model.extend({
        defaults: {
            appDictionary: [],
            filterList: []
        },
        initialize: function() {
            _(this).bindAll();
        },
        search: function(matchString, settingsCollection) {
            var regExpr = (matchString.length <= 3)?new RegExp("^" + matchString, 'i') : new RegExp(matchString, 'i');
            var matchedByNames = [], matchedByStoreNames = []
            this.get('appDictionary').forEach(function(app) {
                if (app.name != undefined && app.name.search(regExpr) >= 0) {
                    var merged = settingsCollection.mergeSettings(app);
                    matchedByNames.push(merged)
                }
                else if (app.storeName != undefined && app.storeName.search(regExpr) >= 0) {
                    var merged = settingsCollection.mergeSettings(app);
                    matchedByStoreNames.push(merged)
                }
            }, this);

            matchedByNames.sort(function(app1, app2) {
                if (app1.name < app2.name) return -1;
                if (app2.name > app2.name) return 1;
                return 0;
            });
            matchedByStoreNames.sort(function(app1, app2) {
                if (app1.storeName < app2.storeName) return -1;
                if (app2.storeName > app2.storeName) return 1;
                if (app1.name < app2.name) return -1;
                if (app2.name > app2.name) return 1;
                return 0;
            });
            var list = _.union(matchedByNames, matchedByStoreNames);
            this.set('filterList', list);
        }
    });

    // one app in matching the search
    dm.AppSearchModel = Backbone.Model.extend({
        initialize: function() {
            this.set('id', this.get('uuid'));
            if (!this.get('applicationIcon')) {
                this.set('defaultIconUrl', 'http://appdemo.openf.in/defaulticons/' + this.get('name').charAt(0).toLowerCase() + '-icon.png');
                console.log("SETTING defaultIconUrl to: " + 'http://appdemo.openf.in/defaulticons/' + this.get('name').charAt(0).toLowerCase() + '-icon.png');
            }
        }
    });

    // all apps matching the search
    dm.AppSearchCollection = Backbone.Collection.extend({
        model: dm.AppSearchModel,
        initialize: function(){
        },

        refresh: function(model, value, options) {
            var models = [];
            value.forEach(function(app) {
                models.push(new dm.AppSearchModel(app))
            }, this);
            this.reset(models);
        },
        updateAppSettings: function(settingsModel) {  // called when an app settings are updated. May need to update search list
            var model = this.get(settingsModel.get('uuid'));
            if (model != undefined) {
                model.set('isEnabled', settingsModel.get('isEnabled'));  // for search list, only isEnabled can change
            }
        }
    });


    // settings for one app
    dm.AppSettingsModel = Backbone.Model.extend({
        defaults: function(){
        },
        initialize: function() {
            _(this).bindAll('launch');

            this.set('id', this.get('uuid'));
            if (!this.get('applicationIcon')) {
                this.set('defaultIconUrl', 'http://appdemo.openf.in/defaulticons/' + this.get('name').charAt(0).toLowerCase() + '-icon.png');
                console.log("SETTING defaultIconUrl to: "  + 'http://appdemo.openf.in/defaulticons/' + this.get('name').charAt(0).toLowerCase() + '-icon.png');
            }
        },
        launch: function() {
            Backbone.Events.trigger('start-application', this.attributes);
        }
    });

    // all app settings
    dm.AppSettingsCollection = Backbone.Collection.extend({
        model: dm.AppSettingsModel,
        initialize: function() {
            this.closeListeners = {};
        },
        refresh: function(value) {
            value.forEach(function(settings) {
                this.updateApp(settings);
            }, this);
        },
        updateApp: function(appSettings) {
            this.add(new dm.AppSettingsModel(appSettings), {merge: true})
            this.addAppCloseListener(appSettings.uuid);
        },
        mergeSettings: function(toObj) {
            var merged;
            var settings = this.get(toObj.uuid);
            if (settings != undefined) {
                merged = $.extend({}, toObj, settings.attributes);
            } else {
                merged = toObj;
            }
            return merged;
        },
        addAppCloseListener: function(uuid) {
            if (this.closeListeners[uuid] == undefined) {
                var callback = $.proxy(function() {
                    this.appClosed(uuid);
                }, this);
                var app = new fin.desktop.Application({_noregister: true, uuid: uuid});
                app.addEventListener('closed', callback);
                this.closeListeners[uuid] = callback;
            }
        },
        appClosed: function(uuid) {
            Backbone.Events.trigger('application-closed', this.get(uuid).attributes);
        }
    });

    // all apps for a store
    dm.AppSettingsGroupModel = Backbone.Model.extend({
        initialize: function() {
            this.set('appGroup', new Backbone.Collection([], {model: dm.AppSettingsModel}));
        },
        refresh: function(value) {
            var models = [];
            value.forEach(function(settings) {
                var app = new dm.AppSettingsModel(settings);
                models.push(app);
            }, this);
            this.get('appGroup').reset(models);
        },
        addApp: function(appSettings) {
            this.get('appGroup').add(new dm.AppSettingsModel(appSettings), {merge: true});
            this.trigger('change', appSettings);
        },
        removeApp: function(appSettings) {
            this.get('appGroup').remove(new dm.AppSettingsModel(appSettings));
            this.trigger('remove', appSettings);
        },
        appCount: function() {
            return this.get('appGroup').length;
        },
        mergeSettings: function(toObj) {
            var merged;
            var settings = this.get('appGroup').get(toObj.uuid);
            if (settings != undefined) {
                merged = $.extend({}, toObj, settings.attributes);
            } else {
                merged = toObj;
            }
            return merged;
        }
    });

    // app settings groups by store name
    dm.AppGroupCollection = Backbone.Collection.extend({
        model: dm.AppSettingsGroupModel,  // apps for each store
        comparator: "sortOrder",       // is should be store name
        defaultGroup: 'My Applications',  // assigned if an app does not belong to any store
        initialize: function(){
            // hard-code images for Stores for now
            this.storeImages = {'OpenFin':'img/of.png', OpenGamma:'img/og.png',
                                    'My Applications':'img/myapps.png',
                                    'NYSE Technologies':'img/nyse.png'};
            this.requiredStores = ['OpenFin', 'My Applications'];  // these 2 names are always on top and stay even if there are no apps in them
            this.requiredStores.forEach($.proxy(function(name) {
                var appGroup = this.createSettingsGroupModel(name, "zzzzz " + this.length);// " " forces required store to sort at end
            }, this));
        },
        refresh: function(value) {
            value.forEach(function(settings) {
                this.updateApp(settings);
            }, this);
        },
        updateApp: function(appSettings) {
            if (appSettings.isEnabled == true) {
                this.addApp(appSettings);
            } else {
                this.removeApp(appSettings);
            }
        },
        addApp: function(appSettings) {
            var sname = appSettings.storeName;
            var appGroup = this.get(sname);
            if (appGroup == undefined) {
                console.log("AppGroupCollection.add " + sname)
                appGroup = this.createSettingsGroupModel(sname, sname);
                if (appSettings.storeSmIconImg) {
                    // all appSettings for a store should have same storeSmIconImg
                    appGroup.set('storeSmIconImg', appSettings.storeSmIconImg, {silent:true});
                    this.findGroupImage(appGroup);
                }

            }
            return appGroup.addApp(appSettings);
        },
        removeApp: function(appSettings) {
            var sname = appSettings.storeName;
            var appGroup = this.get(sname);
            if (appGroup != undefined) {
                console.log("AppGroupCollection.removeApp " + sname)
                appGroup.removeApp(appSettings);
                if (this.requiredStores.indexOf(appGroup.get('id')) < 0) {
                    if (appGroup.appCount() == 0) {
                        this.remove(appGroup);
                    }
                }
            }
        },
        createSettingsGroupModel: function(name, sortOrder) {
            console.log('adding app group ' + name);
            var appGroup = new dm.AppSettingsGroupModel({id: name, sortOrder: sortOrder});
            this.findGroupImage(appGroup)
            this.add(appGroup, {merge: true});
            return appGroup;
        },
        findGroupImage: function(groupModel) {
            if (groupModel.has('storeSmIconImg')) {
                groupModel.set('image', groupModel.get('storeSmIconImg'));
            } else {
                var groupName = groupModel.get('id');
                $.each(this.storeImages, function(key, value) {
                    if (key == groupName) {
                        groupModel.set('image', value);
                    }
                });
            }
        }
    });

    // Model for editing/creating one app
    dm.AppEditModel = Backbone.Model.extend({
        defaults: {
                name: "",
                description: "",
                url: "",
                iconUrl: "",
                defaultWidth: 800,
                defaultHeight: 600,
                resize: true,
                draggable: true,
                roundedCorners: false,
                frame: true,
                cornerRoundHeight: "",
                cornerRoundWidth: "",
                zOrder: "None"
        },
        initialize: function() {
        },
        applyDefaults: function() {
            this.set(this.defaults);
        },
        updateAppSettings: function(settings) {
            this.clear();
            this.applyDefaults();
            this.set(settings);
            if (this.isEmpty('cornerRoundHeight') && this.isEmpty('cornerRoundWidth')) {
                this.set('roundedCorners', false);
            } else {
                this.set('roundedCorners', true);
            }
        },
        isEmpty: function(prop) {
            return this.isEmptyString(this.get(prop));
        },
        isEmptyString: function(value) {
            return value == undefined || value == null || value.length == 0;
        },
        hasPositiveInteger: function(attributes, prop) {
            var value = attributes[prop];
            if (value != undefined) {
                if (/^\d+$/.test(value) == false) {
                    this.set({invalidValueError: prop});
                }
            } else {
                this.set({invalidValueError: prop});
            }
        },
        hasString: function(attributes, prop) {
            var value = attributes[prop];
            if (this.isEmptyString(value) == true) {
                this.set({missingValueError: prop});
            }
        },
        validateSubmitData: function(attributes, options) {
            this.clearErrors();
            // field names in attr are defined in AppEditPageView
            this.hasString(attributes, 'name');
            this.hasString(attributes, 'description');
            this.hasString(attributes, 'url');
            this.hasPositiveInteger(attributes, 'default_height');
            this.hasPositiveInteger(attributes, 'default_width');
            if (attributes['rounded_corners'] == true) {
                this.hasPositiveInteger(attributes, 'corner_round_height');
                this.hasPositiveInteger(attributes, 'corner_round_width');
            }
            return !this.hasErrors();
        },
        clearErrors: function() {
            this.unset('invalidValueError');
            this.unset('missingValueError');
        },
        hasErrors: function() {
            return this.has('invalidValueError') || this.has('missingValueError');

        }
    });


})();