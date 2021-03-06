import Ember from 'ember';
import BaseRoute from 'console/routes/base-route';

export default BaseRoute.extend({

  accessManager: Ember.inject.service(),

  beforeModel: function(transition){ // jshint ignore:line

    var accessManager = this.get('accessManager');
    var isLoggedIn = accessManager.isLoggedIn();
    if( isLoggedIn) {
      var appController = this.controllerFor('application');
      appController.set('isLoggedIn', isLoggedIn);
      return appController.updateAccountInfo().catch((err) => {
        this.error('Error loading account information', err);
        appController.showErrorMessage('Error loading account information', err);
        this.transitionTo('index');
      });
    }
  },

  actions: {
    reset: function(){
      
    }
  }


});
