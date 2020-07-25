angular.module('promiseButton', [])
    .directive('promiseButton', ['$compile', '$timeout',
        function ($compile, $timeout) {
            return {
                restrict: 'A',
                template: [
                    '<span class="promise-button">',
                    '<span ng-show="state != \'ceaseInterval\' && !(promisePending && state == \'progress\')" ng-transclude></span>',
                    '<span ng-show="state == \'ceaseInterval\'"> Cancel in {{ceaseIntervalSec}}s</span>',
                    '<span ng-show="state == \'progress\'" class="pb pb-progress"><span class="icon"></span> {{labelPending}}<span class="dots"><span>.</span><span>.</span><span>.</span></span></span>',
                    '<span ng-show="state == \'success\'" class="pb pb-success"><span class="icon fas fa-check"></span> {{labelSuccess}}</span>',
                    '<span ng-show="state == \'error\'" class="pb pb-error"><span class="icon fas fa-times"></span> {{labelError}}</span>',
                    '</span>'
                ].join(''),
                transclude: true,
                scope: {
                    promiseButton: '&',
                    ngDisabled: '=',
                    ngIf: '=',
                    promiseCeasePeriod: '@',
                    promisePending: '@',
                    promiseSuccess: '@',
                    promiseError: '@'
                },
                link: function postLink(scope, element, attrs) {
                    element.attr('ng-click', 'onClick()');
                    element.attr('meta-ng-click', attrs.promiseButton);
                    if (attrs.ngDisabled) element.attr('ng-disabled', 'ngDisabled');
                    if (attrs.ngIf) element.attr('ng-if', 'ngIf');
                    element.removeAttr('promise-button');
                    angular.element(element.find('span')[1]).removeAttr('ng-transclude')

                    scope.state = 'idle';
                    scope.labelPending = scope.promisePending;
                    scope.labelSuccess = scope.promiseSuccess;
                    scope.labelError = scope.promiseError;

                    var ceaseTimer = null;

                    var intervalTick = function () {
                        if (scope.state != 'ceaseInterval') {
                            return;
                        }

                        scope.ceaseIntervalSec -= 1;
                        if (scope.ceaseIntervalSec <= 0) {
                            scope.start();
                        } else {
                            ceaseTimer = $timeout(intervalTick, 1000);
                        }
                    };

                    scope.onClick = function () {
                        if (scope.state == 'progress') {
                            return;
                        }

                        if (scope.state == 'ceaseInterval') {
                            scope.state = 'idle';
                            $timeout.cancel(ceaseTimer);
                            return;
                        }

                        scope.state = 'ceaseInterval';
                        scope.ceaseIntervalSec = Number(scope.promiseCeasePeriod) || 0;
                        scope.ceaseIntervalSec += 1;
                        intervalTick();
                    };

                    scope.start = function () {
                        if (scope.state == 'progress') {
                            return;
                        }

                        var promise = scope.promiseButton();
                        scope.state = 'progress';

                        promise
                            .then(function () {
                                scope.state = 'success';
                            })
                            .catch(function () {
                                $timeout(function () {
                                    scope.state = 'error';
                                }, 0);
                            })
                            .finally(function () {
                                $timeout(function () {
                                    scope.state = 'idle';
                                }, 1500);
                            });
                    };
                    $compile(element)(scope);
                }
            };
        }]);