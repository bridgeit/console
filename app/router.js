import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('login');
  this.route('register');
  this.route('secure', function() {
    this.route('administrators');
    this.route('realms', {path: '/realms/:realm_id'}, function() {
      this.route('edit');
      this.route('users', function() {
        this.route('create');
        this.route('edit', {path: '/edit/:user_id'});
      });
    });
    this.route('create-realm');
  });
  this.route('forgotpassword');
});

export default Router;
