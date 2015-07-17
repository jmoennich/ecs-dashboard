var production = process.env.NODE_ENV == 'production'

console.log(process.env);

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
var fs = require('fs');
var jwt = require('express-jwt');
var express = require('express');
var requestify = require('requestify');
var bodyParser = require('body-parser');
var compression = require('compression');

var app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(express.static(__dirname + (production ? '/dist' : '/public')));
app.use(jwt({secret: fs.readFileSync('jwt-public.pem')}).unless({path: ['/favicon.ico']}));
app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('invalid token');
  } else {
    next();
  }
});

var error = function (res, err) {
  if (err) {
    console.log(err);
    res.error(err).end();
  }
  return !!err;
};

app.get('/ec2/prices', function (req, res) {
  requestify.get('http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js')
    .then(
    function (response) {
      var result, prices;
      var callback = function (val) {
        prices = val;
      };
      eval(response.getBody());
      prices.config.regions.forEach(function (priceRegion) {
        if (priceRegion.region == region) {
          result = {};
          priceRegion.instanceTypes.forEach(function (instanceType) {
            instanceType.sizes.forEach(function (size) {
              result[size.size] = size.valueColumns[0].prices.USD;
            });
          });
        }
      });
      if (result) {
        res.json(result);
      } else {
        res.status(404).end();
      }
    },
    function (response) {
      res.status(response.statusCode);
    }
  );
});

app.post('/ec2/instances', function (req, res) {
  EC2.describeInstances({InstanceIds: req.body.InstanceIds}, function (err, data) {
    if (!error(res, err)) {
      res.json(data.Reservations.map(function (reservation) {
        return reservation.Instances[0];
      }));
    }
  })
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

app.get('/ecs/instances', function (req, res) {
  ECS.listContainerInstances({}, function (err, data) {
    if (!error(res, err) && data.containerInstanceArns.length) {
      ECS.describeContainerInstances({containerInstances: data.containerInstanceArns}, function (err, descCI) {
        if (!error(res, err)) {
          res.json(descCI.containerInstances);
        }
      });
    } else {
      res.json([]);
    }
  });
});

app.get('/ecs/tasks', function (req, res) {
  ECS.listTasks(function (err, data) {
    if (!error(res, err) && data.taskArns.length) {
      ECS.describeTasks({tasks: data.taskArns}, function (err, data) {
        res.json(data.tasks);
      });
    } else {
      res.json([]);
    }
  });
});

app.get('/ecs/taskDefinition', function (req, res) {
  ECS.describeTaskDefinition({taskDefinition: req.query.arn}, function (err, data) {
    res.json(data);
  })
});

app.listen(3000);
