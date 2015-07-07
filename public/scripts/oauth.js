angular
  .module('ecs-dashboard')
  .config(['$httpProvider', function ($httpProvider) {

    $httpProvider.interceptors.push(['$window', '$location', '$q', function ($window, $location, $q) {

      var token;

      return {

        request: function (config) {
          if (!token) {
            // 1. get token from url
            var matches = $location.path().match(/access_token=(.*?)&/);
            token = matches && matches[1];
            if (token) {
              $location.path('');
              if ($window.localStorage) {
                $window.localStorage.setItem('token', token);
              }
            } else {
              // 2. get token from local storage as fallback
              if ($window.localStorage) {
                token = $window.localStorage.getItem('token');
              }
            }
          }
          config.headers.Authorization = 'Bearer ' + token;
          return config;
        },

        responseError: function (rejection) {
          if (rejection.status == 401) {
            if ($window.localStorage) {
              $window.localStorage.removeItem('token');
            }
            $window.location.href = 'http://' + $window.location.hostname + ':8080/oauth/authorize?' +
              'response_type=token' +
              '&client_id=clientapp' +
              '&scope=read' +
              '&redirect_uri=' + $window.location;
          }
          return $q.reject(rejection);
        }
      };
    }]);

  }]);