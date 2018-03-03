angular.module('pubSub', [])
  .controller('pubSubController', function ($scope) {

    var socket = io(); // connect to the socket on this server
    socket.on('updateArbitage', function (data) { // whenever server send 'updateArbitage'
      $scope.ranks = data; // update
      $scope.$apply(); // send to frontend
    });
  });