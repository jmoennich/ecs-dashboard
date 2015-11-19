angular
  .module('ecs-dashboard')
  .controller('dashboard', ['$scope', '$http', '$interval', '$q', function ($scope, $http, $interval, $q) {

    var logError = function (response) {
      console.log(response);
      $scope.loading = false;
      return $q.reject(response);
    };

    $scope.updateEcsClusters = function () {
      return $http.get('/ecs/clusters')
        .then(function (response) {
          $scope.clusters = response.data;
        });
    };

    $scope.updateEcsInstances = function (cluster) {
      return $http.get('/ecs/clusters/' + cluster + '/instances').then(function (response) {
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

    $scope.updateTasks = function (cluster) {
      return $http.get('/ecs/clusters/' + cluster + '/tasks').then(function (response) {
        var tasks = response.data;
        $scope.instances.forEach(function (inst) {
          inst.tasks = [];
        });
        tasks.forEach(function (task) {
          $http.get('/ecs/taskDefinition', {params: {arn: task.taskDefinitionArn}}).then(function (response) {
            response.data.taskDefinition.containerDefinitions.forEach(function (containerDefinition) {
              task.containers.forEach(function (container) {
                if (container.name === containerDefinition.name) {
                  container.containerDefinition = containerDefinition;
                }
              });
            });
            task.definition = response.data;
          });
          $scope.instances.forEach(function (inst) {
            if (task.containerInstanceArn == inst.ecs.containerInstanceArn) {
              inst.tasks.push(task);
            }
          });
        });
      }, logError);
    };

    $scope.clusterChanged = function () {
      $scope.loading = true;
      $scope.instances = [];
      $scope.updateEcsInstances($scope.cluster).then(function () {
        $scope.loading = false;
        $scope.updateEc2Instances();
        $scope.updateEc2CpuUsages();
        $scope.updateTasks($scope.cluster);
      });
      /*
       .then(function () {
       $interval($scope.updateTasks, 5000);
       $interval($scope.updateEc2CpuUsage, 60000);
       });
       */
    };

    // initial
    $scope.updateEcsClusters();

  }]);