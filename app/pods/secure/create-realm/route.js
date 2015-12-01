import Ember from 'ember';
import Realm from 'admin/models/realm';

export default Ember.Route.extend({

	model: function(){
		var currentAccount = this.controllerFor('application').get('account');
		var realm = Realm.create({account: currentAccount});
		return realm;
	},

});
