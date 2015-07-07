angular.module('ecs-dashboard')

  .directive('cpuData', function () {

    return {
      restrict: 'A',
      scope: {
        cpuData: '='
      },
      link: function (scope, element) {

        scope.$watch('cpuData.ResponseMetadata.RequestId', function (nu, old) {

          var points = scope.cpuData && scope.cpuData.Datapoints;

          if (points) {
            var canvas = element[0];
            canvas.width = canvas.height * (canvas.clientWidth / canvas.clientHeight);
            var width = canvas.offsetWidth;
            var height = canvas.offsetHeight;
            var ctx = canvas.getContext('2d');
            var peek = 0;
            var fx = Math.ceil(width / points.length);
            var fy = height / 100;
            var path = new Path2D();
            for (var i = 0; i < points.length; i++) {
              var avg = points[i].Average;
              peek = Math.max(peek, avg);
              if (i == 0) {
                path.moveTo(i * fx, height - (avg * fy));
              } else {
                path.lineTo(i * fx, height - (avg * fy));
              }
            }
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.stroke(path);
            ctx.font = "14px DINMedium, sans-serif";
            ctx.fillText('CPU Peek: ' + peek + '%', 0, 14);
          }
        });
      }
    };
  });
