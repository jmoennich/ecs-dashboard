var production = process.env.NODE_ENV == 'production'

// amazon
var AWS = require('aws-sdk');
var region = 'eu-west-1';
AWS.config.update({
  region: region
});
var ECS = new AWS.ECS();
var EC2 = new AWS.EC2();
var cloudwatch = new AWS.CloudWatch();

// application
var jwt = require('express-jwt');
var express = require('express');
var requestify = require('requestify');
var bodyParser = require('body-parser');
var compression = require('compression');

var app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(express.static(__dirname + (production ? '/dist' : '/public')));
/*
 app.use(jwt({secret: fs.readFileSync('jwt-public.pem')}).unless({path: ['/favicon.ico']}));
 app.use(function (err, req, res, next) {
 if (err.name === 'UnauthorizedError') {
 res.status(401).send('invalid token');
 } else {
 next();
 }
 });
 */

var error = function (res, err) {
  if (err) {
    console.log(err);
    res.error(err).end();
  }
  return !!err;
};

app.post('/ec2/instances', function (req, res) {
  var ids = req.body.InstanceIds;
  if (ids && ids.length > 0) {
    EC2.describeInstances({InstanceIds: ids}, function (err, data) {
      if (!error(res, err)) {
        res.json(data.Reservations.map(function (reservation) {
          return reservation.Instances[0];
        }));
      }
    })
  } else {
    res.json([]);
  }
});

app.get('/ec2/instances/:id/cpu', function (req, res) {

  var end = new Date();
  var start = new Date();
  start.setHours(end.getHours() - 1);

  var params = {
    EndTime: end,
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/EC2',
    Period: 60,
    StartTime: start,
    Statistics: ['Average'],
    Dimensions: [{Name: 'InstanceId', Value: req.params.id}],
    Unit: 'Percent'
  };

  cloudwatch.getMetricStatistics(params, function (err, data) {
    if (!error(res, err)) {
      data.Datapoints.sort(function (a, b) {
        return new Date(a.Timestamp) - new Date(b.Timestamp);
      });
      res.json(data);
    }
  });
});

app.get('/ecs/clusters', function (req, res) {
  ECS.listClusters({}, function (err, data) {
    res.json(data.clusterArns.map(function(clusterArn) {
      var split = clusterArn.split('/');
      return split.length > 1 ? split[1] : '';
    }));
  });
});

app.get('/ecs/clusters/:cluster/instances', function (req, res) {
  ECS.listContainerInstances({cluster: req.params.cluster}, function (err, data) {
    if (!error(res, err) && data.containerInstanceArns.length) {
      ECS.describeContainerInstances({cluster: req.params.cluster, containerInstances: data.containerInstanceArns},
        function (err, descCI) {
          if (!error(res, err)) {
            res.json(descCI.containerInstances);
          }
        });
    } else {
      res.json([]);
    }
  });
});

app.get('/ecs/clusters/:cluster/tasks', function (req, res) {
  ECS.listTasks({cluster: req.params.cluster}, function (err, data) {
    if (!error(res, err) && data.taskArns.length) {
      ECS.describeTasks({cluster: req.params.cluster, tasks: data.taskArns}, function (err, data) {
        res.json(data.tasks);
      });
    } else {
      res.json([]);
    }
  });
});

app.get('/ecs/taskDefinition', function (req, res) {
  ECS.describeTaskDefinition({taskDefinition: req.query.arn}, function (err, data) {
    console.log(req.query.arn);
    res.json(data);
  })
});

app.listen(3000);
