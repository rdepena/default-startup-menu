(function () {
  'use strict';

  angular.module('launcher')
  .controller('myAppsCtrl', function ($scope, appsApi) {
    var model = {
      apps : appsApi.get()
    };
    
    $scope.model = model;
  });
}());
