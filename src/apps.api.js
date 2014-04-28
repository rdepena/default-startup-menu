(function () {
  'use strict';

  angular.module('apps.api', [])
  .factory('appsApi', function () {
    var my = {};

    my.get = function () {
      //Just mock the data.
      return [
        {
          name: "Bond RFQ 1.4.0",
          version: "1.4.0",
          description: "Bond RFQ 1.4.0",
          url: "https://bondrfq.openf.in/bondrfq/1.4.0.0b/",
          uuid: "295f6053-4119-45e2-a8df-0193fd9ee2d3",
          applicationGroup: "OpenFin",
          draggable: false,
          defaultHeight: 480,
          defaultWidth: 680,
          hideWhileChildrenVisible: false,
          applicationIcon: "https://bondrfq.openf.in/bondrfq/1.4.0.0b/img/BondRFQ_icon.png",
          groupIconUrl: "",
          launchExternal: "openfin",
          company: "OpenFin",
          storeName: "OpenFin",
          storeSmIconImg: "",
          autoShow: false,
          resize: true,
          frame: true,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: null,
            height: null
          }
        },
          {
          name: "Deal",
          version: "1.4.0",
          description: "Deal",
          url: "https://fxlive.openf.in/fxlive/1.4.0.0b/",
          uuid: "b89f0231-0b36-4bf8-bad4-606a15a07811",
          applicationGroup: "OpenFin",
          draggable: false,
          defaultHeight: 545,
          defaultWidth: 856,
          hideWhileChildrenVisible: false,
          applicationIcon: "https://fxlive.openf.in/fxlive/1.4.0.0b/img/FXlive_icon.png",
          groupIconUrl: "",
          launchExternal: "openfin",
          company: "OpenFin",
          storeName: "OpenFin",
          storeSmIconImg: "",
          autoShow: false,
          resize: true,
          frame: true,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: null,
            height: null
          }
        },
        {
          name: "Ticker 1.4.0",
          version: "1.4.0",
          description: "Ticker 1.4.0",
          url: "https://ticker.openf.in/ticker/1.4.0.0b",
          uuid: "b05ff7a8-7d53-4ed6-94b1-799c5b2fb0b5",
          applicationGroup: "OpenFin",
          draggable: false,
          defaultHeight: 66,
          defaultWidth: 815,
          hideWhileChildrenVisible: false,
          applicationIcon: "https://ticker.openf.in/ticker/1.4.0.0b/img/Ticker_icon.png",
          groupIconUrl: "",
          launchExternal: "openfin",
          company: "OpenFin",
          storeName: "OpenFin",
          storeSmIconImg: "",
          autoShow: false,
          resize: false,
          frame: false,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: null,
            height: null
          }
        },
        {
          name: "BondFeed 1.4.0",
          version: "1.4.0",
          description: "BondFeed 1.4.0",
          url: "https://bondrfq.openf.in/bondfeed/1.4.0.0b/",
          uuid: "70b82e33-7b53-4be8-8623-832c30e1ef22",
          applicationGroup: "OpenFin",
          draggable: false,
          defaultHeight: 157,
          defaultWidth: 157,
          hideWhileChildrenVisible: false,
          applicationIcon: "https://bondrfq.openf.in/bondfeed/1.4.0.0b/img/bondfeed_icon.png",
          groupIconUrl: "",
          launchExternal: "openfin",
          company: "OpenFin",
          storeName: "OpenFin",
          storeSmIconImg: "",
          autoShow: false,
          resize: false,
          frame: false,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: null,
            height: null
          }
        },
        {
          name: "Market Cal 1.4.0",
          version: "1.4.0",
          description: "Market Cal 1.4.0",
          url: "http://appdemo.openf.in/calendar/1.4.0.0b",
          uuid: "7766def3-d65c-4cc6-be3b-c35a570493a6",
          applicationGroup: "OpenFin",
          draggable: false,
          defaultHeight: 231,
          defaultWidth: 212,
          hideWhileChildrenVisible: false,
          applicationIcon: "http://appdemo.openf.in/calendar/1.4.0.0b/img/calendar_icon.png",
          groupIconUrl: "",
          launchExternal: "openfin",
          company: "OpenFin",
          storeName: "OpenFin",
          storeSmIconImg: "",
          autoShow: false,
          resize: false,
          frame: false,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: null,
            height: null
          }
        },
        {
          name: "FirstApp",
          version: "1.0.0",
          description: "http://local:5000/",
          url: "http://local:5000/",
          uuid: "1967e025-5771-49ca-9e94-c9abaa689f7b",
          draggable: true,
          defaultHeight: 600,
          defaultWidth: 800,
          applicationIcon: "",
          launchExternal: "OpenFin",
          autoShow: false,
          resize: true,
          frame: true,
          isEnabled: true,
          launchOnLogin: false,
          isMyApp: true,
          windowLeft: 10,
          windowTop: 10,
          opacity: 1,
          appOrder: 1,
          cornerRounding: {
            width: 0,
            height: 0
          }
        }];
    };

    return my;
  });
}());
