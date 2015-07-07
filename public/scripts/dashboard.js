angular
  .module('ecs-dashboard')
  .controller('dashboard', ['$scope', '$http', '$interval', '$q', function ($scope, $http, $interval, $q) {

    $scope.instances = [];
    $scope.loading = true;

    var logError = function (response) {
      console.log(response);
      $scope.loading = false;
      return $q.reject(response);
    };

    $scope.updateEcsInstances = function () {
      return $http.get('/ecs/instances').then(function (response) {
        var insts = response.data;
        $scope.loading = false;
        $scope.instances = insts.map(function (inst) {
          return {ecs: inst}
        });
      }, logError);
    };

    $scope.updateEc2Instances = function () {
      return $http.post('/ec2/instances', {
        InstanceIds: $scope.instances.map(function (inst) {
          return inst.ecs.ec2InstanceId;
        })
      }).then(function (response) {
        var insts = response.data;
        $scope.instances.forEach(function (inst, index) {
          inst.ec2 = insts[index];
        });
      }, logError);
    };

    $scope.updateEc2CpuUsages = function () {
      return $q.all($scope.instances.map(function (inst) {
        return $http.get('/ec2/instances/' + inst.ecs.ec2InstanceId + '/cpu')
          .then(function (response) {
            inst.cpu = response.data;
          }, logError);
      }));
    };

    $scope.updateTasks = function () {
      return $http.get('/ecs/tasks').then(function (response) {
        var tasks = response.data;
        $scope.instances.forEach(function (inst) {
          inst.tasks = [];
        });
        tasks.forEach(function (task) {
          $scope.instances.forEach(function (inst) {
            if (task.containerInstanceArn == inst.ecs.containerInstanceArn) {
              inst.tasks.push(task);
            }
          });
        });
      }, logError);
    };

    $scope.updateEc2Prices = function () {
      return $http.get('/ec2/prices').then(function (response) {
        $scope.prices = response.data;
      });
    };

    $scope.updateEcsInstances()
      .then(function () {
        $scope.updateEc2Instances();
        $scope.updateEc2CpuUsages();
        $scope.updateEc2Prices();
        $scope.updateTasks();
      })
      .then(function () {
        $interval($scope.updateTasks, 5000);
        $interval($scope.updateEc2CpuUsage, 60000);
      });

  }]);